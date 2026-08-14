import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, render, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { SessionController, type LineRole, type TranscriptLine } from "./controller.js";
import { completeCommand } from "../complete.js";
import { formatStatusLine } from "../statusline.js";

const MAX_SUGGESTIONS = 8;

function Suggestions({ matches }: { matches: string[] }): React.JSX.Element | null {
  if (matches.length === 0) return null;
  const shown = matches.slice(0, MAX_SUGGESTIONS);
  const extra = matches.length - shown.length;
  return (
    <Box>
      <Text dimColor>
        {"tab ⇥ "}
        {shown.join("  ")}
        {extra > 0 ? `  (+${extra})` : ""}
      </Text>
    </Box>
  );
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** A braille spinner frame that advances while `active`, or a steady chevron when idle. */
function usePromptGlyph(active: boolean): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 80);
    return () => clearInterval(id);
  }, [active]);
  return active ? (SPINNER_FRAMES[frame % SPINNER_FRAMES.length] ?? "⠋") : "›";
}

const ROLE_COLOR: Record<LineRole, string> = {
  user: "cyan",
  assistant: "white",
  tool: "gray",
  system: "yellow",
};

function Line({ line }: { line: TranscriptLine }): React.JSX.Element {
  const prefix = line.role === "user" ? "› " : "";
  return (
    <Text color={ROLE_COLOR[line.role]} dimColor={line.role === "tool"}>
      {prefix}
      {line.text}
    </Text>
  );
}

const INPUT_PLACEHOLDER = "type a prompt, /help, or !cmd to run a shell command";

interface PromptProps {
  input: string;
  setInput: (value: string) => void;
  submit: (value: string) => void;
  glyph: string;
  thinking: boolean;
}

/** Shell mode: the leading "!" becomes a yellow glyph and the field shows just the command. */
function ShellPrompt({ input, setInput, submit }: PromptProps): React.JSX.Element {
  const command = input.slice(1);
  const onChange = (value: string) => setInput(value.length > 0 ? `!${value}` : value);
  return (
    <Box>
      <Text color="yellow" bold>
        {"! "}
      </Text>
      <Text color="yellow">
        <TextInput
          value={command}
          onChange={onChange}
          onSubmit={() => submit(input)}
          placeholder={INPUT_PLACEHOLDER}
        />
      </Text>
    </Box>
  );
}

/** Normal prompt: chevron (or spinner while thinking) and a plain field. */
function ChatPrompt({ input, setInput, submit, glyph, thinking }: PromptProps): React.JSX.Element {
  return (
    <Box>
      <Text color={thinking ? "yellow" : "green"}>{glyph} </Text>
      <TextInput
        value={input}
        onChange={setInput}
        onSubmit={() => submit(input)}
        placeholder={INPUT_PLACEHOLDER}
      />
    </Box>
  );
}

/** Pick the prompt flavour: a `!`-prefixed line runs a shell command. */
function Prompt(props: PromptProps): React.JSX.Element {
  return props.input.startsWith("!") ? <ShellPrompt {...props} /> : <ChatPrompt {...props} />;
}

export function App({ controller }: { controller: SessionController }): React.JSX.Element {
  const { exit } = useApp();
  const [, forceRender] = useState(0);
  const [input, setInput] = useState("");

  useEffect(() => {
    controller.onExit = () => exit();
    return controller.subscribe(() => forceRender((n) => n + 1));
  }, [controller, exit]);

  const onSubmit = useCallback(
    (value: string) => {
      setInput("");
      void controller.submit(value);
    },
    [controller],
  );

  const { lines, model, status, pickerOpen, models, branch, credits } = controller.state;
  const { matches, completed } = completeCommand(input, controller.commandNames());
  const thinking = status === "thinking";
  const glyph = usePromptGlyph(thinking);

  useInput((_, key) => {
    if (key.tab && !pickerOpen) setInput(completed);
  });

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        {lines.map((line, i) => (
          <Line key={i} line={line} />
        ))}
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        borderDimColor
        borderLeft={false}
        borderRight={false}
      >
        {pickerOpen ? (
          <SelectInput
            items={models}
            onSelect={(item) => void controller.chooseModel(item.value)}
          />
        ) : (
          <Box flexDirection="column">
            <Prompt
              input={input}
              setInput={setInput}
              submit={onSubmit}
              glyph={glyph}
              thinking={thinking}
            />
            <Suggestions matches={matches} />
          </Box>
        )}
      </Box>

      <Box>
        <Text color="green" bold>
          giopilot{" "}
        </Text>
        <Text dimColor>{formatStatusLine({ model, status, branch, credits })}</Text>
      </Box>
    </Box>
  );
}

/** Render the TUI and resolve when the user exits. */
export async function runTui(controller: SessionController): Promise<void> {
  const { waitUntilExit } = render(<App controller={controller} />);
  await waitUntilExit();
}
