export function readTopLevelNotifyConfig(text) {
  const located = locateTopLevelKey(text, "notify");
  if (!located) {
    return { value: [], range: null };
  }

  return {
    value: parseTomlStringArray(located.valueText),
    range: located.range
  };
}

export function replaceTopLevelNotifyConfig(text, command) {
  const line = `notify = ${JSON.stringify(command)}`;
  const current = readTopLevelNotifyConfig(text);

  if (!current.range) {
    return `${line}\n${text}`;
  }

  return `${text.slice(0, current.range.start)}${line}${text.slice(current.range.end)}`;
}

export function isReadAloudNotify(command) {
  return Array.isArray(command) && command.some((part) => String(part).includes("codex-read-aloud-notify.mjs"));
}

function locateTopLevelKey(text, key) {
  const lines = text.split(/(?<=\n)/);
  let offset = 0;
  let inTable = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && !trimmed.startsWith("[[")) {
      inTable = true;
    }

    if (!inTable && new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`).test(line)) {
      const start = offset;
      let collected = line;
      let end = offset + line.length;
      let balance = bracketBalance(stripComment(line));

      for (let index = lineIndex + 1; balance > 0 && index < lines.length; index += 1) {
        collected += lines[index];
        end += lines[index].length;
        balance += bracketBalance(stripComment(lines[index]));
      }

      const equalsIndex = collected.indexOf("=");
      return {
        valueText: collected.slice(equalsIndex + 1),
        range: { start, end: trimTrailingNewlineEnd(text, end) }
      };
    }

    offset += line.length;
  }

  return null;
}

function parseTomlStringArray(source) {
  const input = stripComments(source).trim();
  if (!input.startsWith("[") || !input.endsWith("]")) {
    throw new Error("Codex notify must be a TOML array of strings.");
  }

  const values = [];
  let index = 1;

  while (index < input.length - 1) {
    index = skipWhitespaceAndCommas(input, index);
    if (index >= input.length - 1) {
      break;
    }

    const quote = input[index];
    if (quote !== "\"" && quote !== "'") {
      throw new Error("Codex notify array may only contain strings.");
    }

    const parsed = readTomlString(input, index);
    values.push(parsed.value);
    index = parsed.nextIndex;
  }

  return values;
}

function readTomlString(input, start) {
  const quote = input[start];
  let value = "";
  let index = start + 1;

  while (index < input.length) {
    const char = input[index];
    if (char === quote) {
      return { value, nextIndex: index + 1 };
    }
    if (quote === "\"" && char === "\\") {
      const next = input[index + 1];
      if (next === "n") value += "\n";
      else if (next === "t") value += "\t";
      else if (next === "r") value += "\r";
      else value += next || "";
      index += 2;
      continue;
    }
    value += char;
    index += 1;
  }

  throw new Error("Unterminated string in Codex notify array.");
}

function stripComments(source) {
  return source.split(/\r?\n/).map(stripComment).join("\n");
}

function stripComment(line) {
  let quote = "";
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote === "\"" && char === "\\" && !escaped) {
      escaped = true;
      continue;
    }
    if ((char === "\"" || char === "'") && !escaped) {
      quote = quote === char ? "" : quote || char;
    }
    if (char === "#" && !quote) {
      return line.slice(0, index);
    }
    escaped = false;
  }

  return line;
}

function bracketBalance(line) {
  return [...line].reduce((balance, char) => {
    if (char === "[") return balance + 1;
    if (char === "]") return balance - 1;
    return balance;
  }, 0);
}

function skipWhitespaceAndCommas(input, index) {
  while (index < input.length && /[\s,]/.test(input[index])) {
    index += 1;
  }
  return index;
}

function trimTrailingNewlineEnd(text, end) {
  if (text[end - 1] === "\n") {
    return end - 1;
  }
  return end;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
