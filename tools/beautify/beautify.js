const editor = document.getElementById("editor");


let debounceTimer = null;
editor.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    processContent();
  }, 150);
});

editor.addEventListener("paste", (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  document.execCommand("insertText", false, text);
  setTimeout(processContent, 50);
});

editor.addEventListener("drop", e => {
  e.preventDefault();
  const text = e.dataTransfer.getData("text/plain");
  if (text) {
    document.execCommand("insertText", false, text);
    processContent();
  }
});


let lastProcessedHash = "";

function processContent() {
  const raw = editor.innerText;
  if (!raw.trim()) return;


  const hash = raw.length + "|" + raw.slice(0, 100) + "|" + raw.slice(-100);
  if (hash === lastProcessedHash) return;


  setTimeout(() => {
    const out = advancedBeautify(raw);
    const findings = scanSensitivePatterns(out);
    const html = annotateSensitive(out, findings);


    if (html !== editor.innerHTML) {
      const selection = saveSelection();
      editor.innerHTML = html;
      restoreSelection(selection);
    }

    lastProcessedHash = hash;
  }, 0);
}

function advancedBeautify(src) {
  try {

    return formatJavaScriptBasic(src);
  } catch (e) {
    return src;
  }
}

function formatJavaScriptBasic(code) {

  let result = "";
  let indent = 0;
  const indentSize = 2;
  let inString = false;
  let stringChar = '';
  let escapeNext = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1] || '';
    const prevChar = code[i - 1] || '';

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (inString) {
      result += char;
      if (char === '\\') {
        escapeNext = true;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      result += char;
      inString = true;
      stringChar = char;
      continue;
    }


    if (char === '}') {
      indent--;
      result = result.trimEnd() + '\n' + ' '.repeat(indent * indentSize) + '}';
    } else if (char === '{') {
      result = result.trimEnd() + ' {\n' + ' '.repeat(++indent * indentSize);
    } else if (char === ';' && nextChar !== '\n') {
      result += ';\n' + ' '.repeat(indent * indentSize);
    } else if (char === '\n') {
      result += '\n' + ' '.repeat(indent * indentSize);
    } else {
      result += char;
    }
  }

  return result;
}

function scanSensitivePatterns(code) {
  const findings = [];
  const patterns = [

    { type: "url", regex: /\bhttps?:\/\/[^\s"'`<>]{8,}/gi, className: "hl-url" },

    { type: "jwt", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, className: "hl-jwt" },

    { type: "aws_key", regex: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, className: "hl-aws" },

    { type: "api_key", regex: /\b(sk_|pk_|key_)[a-z0-9_-]{20,}\b/gi, className: "hl-api" },

    { type: "hex_token", regex: /\b[a-f0-9]{32,}\b/gi, className: "hl-hex" },

    { type: "base64", regex: /\b[A-Za-z0-9+/]{30,}={0,2}\b/g, className: "hl-b64" },

    { type: "endpoint", regex: /\b(api|v[0-9])\/[a-z0-9_/-]{3,}\b/gi, className: "hl-endpoint" },

    { type: "secret_var", regex: /(password|passwd|secret|token|key|api[_-]?key)\s*[:=]\s*['"]?([^'"\s,;]{8,})['"]?/gi, className: "hl-secret", group: 2 }
  ];

  patterns.forEach(pattern => {
    const regex = new RegExp(pattern.regex);
    let match;
    while ((match = regex.exec(code)) !== null) {
      const value = pattern.group ? match[pattern.group] : match[0];
      const startIndex = pattern.group ? match.index + match[0].indexOf(value) : match.index;

      findings.push({
        type: pattern.type,
        value: value,
        index: startIndex,
        length: value.length,
        className: pattern.className
      });
    }
  });


  findings.sort((a, b) => a.index - b.index);
  const filteredFindings = [];
  let lastEnd = 0;

  findings.forEach(finding => {
    if (finding.index >= lastEnd) {
      filteredFindings.push(finding);
      lastEnd = finding.index + finding.length;
    }
  });

  return filteredFindings;
}

function annotateSensitive(code, findings) {
  if (!findings.length) return escapeHtml(code).replace(/\n/g, "<br>");


  findings.sort((a, b) => b.index - a.index);
  let result = escapeHtml(code);

  findings.forEach(finding => {
    const before = result.slice(0, finding.index);
    const target = result.slice(finding.index, finding.index + finding.length);
    const after = result.slice(finding.index + finding.length);
    result = before + `<span class="${finding.className}" title="${finding.type}">${target}</span>` + after;
  });

  return result.replace(/\n/g, "<br>");
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


function saveSelection() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;

  const range = sel.getRangeAt(0);
  const preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(editor);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);

  return {
    start: preSelectionRange.toString().length,
    end: preSelectionRange.toString().length + range.toString().length
  };
}

function restoreSelection(savedSel) {
  if (!savedSel) {
    placeCaretAtEnd(editor);
    return;
  }

  const textNodes = getTextNodes(editor);
  let charIndex = 0, startNode, startOffset, endNode, endOffset;

  for (const node of textNodes) {
    const length = node.textContent.length;

    if (!startNode && charIndex + length > savedSel.start) {
      startNode = node;
      startOffset = savedSel.start - charIndex;
    }

    if (!endNode && charIndex + length > savedSel.end) {
      endNode = node;
      endOffset = savedSel.end - charIndex;
    }

    charIndex += length;
  }

  const sel = window.getSelection();
  const range = document.createRange();

  if (startNode) {
    range.setStart(startNode, Math.min(startOffset, startNode.textContent.length));
  } else {
    range.setStart(editor, editor.childNodes.length);
  }

  if (endNode) {
    range.setEnd(endNode, Math.min(endOffset, endNode.textContent.length));
  } else {
    range.setEnd(editor, editor.childNodes.length);
  }

  sel.removeAllRanges();
  sel.addRange(range);
}

function getTextNodes(node) {
  const textNodes = [];
  const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
  while (walk.nextNode()) {
    textNodes.push(walk.currentNode);
  }
  return textNodes;
}

function placeCaretAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}


const style = document.createElement('style');
style.textContent = `
.hl-url { background: #e6f3ff; color: #0066cc; border-bottom: 1px dotted #0066cc; }
.hl-jwt { background: #fff0f0; color: #cc0000; border-bottom: 1px dotted #cc0000; }
.hl-aws { background: #fff5e6; color: #ff6600; border-bottom: 1px dotted #ff6600; }
.hl-api { background: #f0fff0; color: #009900; border-bottom: 1px dotted #009900; }
.hl-hex { background: #f0f0ff; color: #6600cc; border-bottom: 1px dotted #6600cc; }
.hl-b64 { background: #fffaf0; color: #996600; border-bottom: 1px dotted #996600; }
.hl-endpoint { background: #f5f0ff; color: #660099; border-bottom: 1px dotted #660099; }
.hl-secret { background: #fff0f5; color: #cc0066; border-bottom: 1px solid #cc0066; }
`;
document.head.appendChild(style);


editor.setAttribute('contenteditable', 'true');
editor.spellcheck = false;