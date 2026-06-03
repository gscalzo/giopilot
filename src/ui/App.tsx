import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, render, useApp } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import { SessionController, type LineRole, type TranscriptLine } from "./controller.js";

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

  const { lines, model, status, pickerOpen, models } = controller.state;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="green" bold>
          giopilot{" "}
        </Text>
        <Text dimColor>
          model: {model} · {status}
        </Text>
      </Box>
      <Box flexDirection="column" marginY={1}>
        {lines.map((line, i) => (
          <Line key={i} line={line} />
        ))}
      </Box>
      {pickerOpen ? (
        <SelectInput
          items={models}
          onSelect={(item) => void controller.chooseModel(item.value)}
        />
      ) : (
        <Box>
          <Text color="green">› </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={onSubmit}
            placeholder="type a prompt, or /help"
          />
        </Box>
      )}
    </Box>
  );
}

/** Render the TUI and resolve when the user exits. */
export async function runTui(controller: SessionController): Promise<void> {
  const { waitUntilExit } = render(<App controller={controller} />);
  await waitUntilExit();
}
