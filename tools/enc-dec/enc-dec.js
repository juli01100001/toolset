const left = document.getElementById("left");
const right = document.getElementById("right");

const PLACEHOLDERS = {
    left: "paste encoded input here",
    right: "output"
};

let lock = null;

function setupPlaceholder(editor, text) {
    function update() {
        const isEmpty = !editor.textContent.trim() || editor.textContent === text;
        if (isEmpty) {
            editor.classList.add("placeholder");
            editor.textContent = text;
        } else {
            editor.classList.remove("placeholder");
        }
    }
    
    editor.addEventListener("focus", () => {
        if (editor.classList.contains("placeholder")) {
            editor.textContent = "";
            editor.classList.remove("placeholder");
        }
    });
    
    editor.addEventListener("blur", update);
    update();
}

function getValue(editor) {
    if (editor.classList.contains("placeholder")) {
        editor.textContent = "";
        editor.classList.remove("placeholder");
        return "";
    }
    return editor.textContent;
}

function setValue(editor, value) {
    editor.textContent = value;
    editor.classList.remove("placeholder");
}

function b64Decode(v) {
    try {
        v = v.replace(/\s+/g, '');
        v = v.replace(/-/g, "+").replace(/_/g, "/");
        const pad = v.length % 4;
        if (pad) v += "=".repeat(4 - pad);
        const decoded = atob(v);
        try {
            return decodeURIComponent(decoded.split('').map(c => 
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join(''));
        } catch {
            return decoded;
        }
    } catch {
        return null;
    }
}

function b64Encode(v) {
    try {
        return btoa(encodeURIComponent(v).replace(/%([0-9A-F]{2})/g, (match, p1) => 
            String.fromCharCode('0x' + p1)
        )).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch {
        return btoa(v).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
}

function hexDecode(hex) {
    try {
        hex = hex.replace(/\s+/g, '').toLowerCase();
        if (!/^[0-9a-f]+$/i.test(hex)) return null;
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return str;
    } catch {
        return null;
    }
}

function hexEncode(str) {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex;
}

function urlDecode(str) {
    try {
        return decodeURIComponent(str);
    } catch {
        try {
            return decodeURI(str);
        } catch {
            return str;
        }
    }
}

function urlEncode(str) {
    return encodeURIComponent(str);
}

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, c => 
        String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))
    );
}

function binaryDecode(bin) {
    try {
        bin = bin.replace(/\s+/g, '');
        if (!/^[01]+$/i.test(bin)) return null;
        let str = '';
        for (let i = 0; i < bin.length; i += 8) {
            str += String.fromCharCode(parseInt(bin.substr(i, 8), 2));
        }
        return str;
    } catch {
        return null;
    }
}

function binaryEncode(str) {
    let bin = '';
    for (let i = 0; i < str.length; i++) {
        bin += str.charCodeAt(i).toString(2).padStart(8, '0');
    }
    return bin;
}

function tryJSON(v) {
    try {
        return JSON.stringify(JSON.parse(v), null, 2);
    } catch {
        return null;
    }
}

function detectEncoding(value) {
    if (!value.trim()) return 'text';
    
    const clean = value.replace(/\s+/g, '');
    
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(clean)) {
        const parts = clean.split('.');
        if (parts.length === 3) return 'jwt';
    }
    
    if (/^[01]+$/.test(clean) && clean.length >= 8 && clean.length % 8 === 0) return 'binary';
    
    if (/^[0-9a-f]+$/i.test(clean) && clean.length % 2 === 0) return 'hex';
    
    if (/%[0-9A-Fa-f]{2}/.test(value) && value.includes('%')) return 'url';
    
    try {
        const test = clean.replace(/-/g, "+").replace(/_/g, "/");
        const pad = test.length % 4;
        const padded = pad ? test + "=".repeat(4 - pad) : test;
        atob(padded);
        return 'base64';
    } catch {}
    
    if (/^[A-Za-z0-9+/=]+$/.test(clean)) {
        try {
            const test = clean.replace(/-/g, "+").replace(/_/g, "/");
            const pad = test.length % 4;
            const padded = pad ? test + "=".repeat(4 - pad) : test;
            atob(padded);
            return 'base64';
        } catch {}
    }
    
    if (/^[A-Za-z0-9_-]+$/.test(clean) && clean.length > 10) {
        try {
            const test = clean.replace(/-/g, "+").replace(/_/g, "/");
            const pad = test.length % 4;
            const padded = pad ? test + "=".repeat(4 - pad) : test;
            atob(padded);
            return 'base64';
        } catch {}
    }
    
    return 'text';
}

function decodeAll(value) {
    if (!value.trim()) return '';
    
    const encoding = detectEncoding(value);
    const results = [];
    
    if (encoding === 'jwt') {
        const parts = value.trim().split('.');
        if (parts.length === 3) {
            try {
                const header = b64Decode(parts[0]);
                const payload = b64Decode(parts[1]);
                if (header) results.push(`header: ${tryJSON(header) || header}`);
                if (payload) results.push(`payload: ${tryJSON(payload) || payload}`);
                if (parts[2]) results.push(`signature: ${parts[2]}`);
            } catch {}
        }
    }
    
    if (encoding === 'base64') {
        try {
            const decoded = b64Decode(value);
            if (decoded) results.push(tryJSON(decoded) || decoded);
        } catch {}
    }
    
    if (encoding === 'hex') {
        try {
            const decoded = hexDecode(value);
            if (decoded) results.push(tryJSON(decoded) || decoded);
        } catch {}
    }
    
    if (encoding === 'url') {
        try {
            const decoded = urlDecode(value);
            if (decoded && decoded !== value) results.push(tryJSON(decoded) || decoded);
        } catch {}
    }
    
    if (encoding === 'binary') {
        try {
            const decoded = binaryDecode(value);
            if (decoded) results.push(tryJSON(decoded) || decoded);
        } catch {}
    }
    
    if (results.length === 0) {
        results.push(value);
        try {
            const rot13decoded = rot13(value);
            if (rot13decoded !== value) results.push(`ROT13: ${rot13decoded}`);
        } catch {}
    }
    
    return results.join('\n\n');
}

function encodeAll(value) {
    if (!value.trim()) return '';
    
    const results = [];
    
    results.push(b64Encode(value));
    results.push(hexEncode(value));
    results.push(urlEncode(value));
    results.push(binaryEncode(value));
    
    const json = tryJSON(value);
    if (json) {
        results.push(b64Encode(value));
    }
    
    try {
        const rot13encoded = rot13(value);
        if (rot13encoded !== value) results.push(rot13encoded);
    } catch {}
    
    return results.join('\n');
}

function processText(text, direction) {
    if (!text.trim()) return '';
    
    if (direction === 'decode') {
        return decodeAll(text);
    } else {
        return encodeAll(text);
    }
}

setupPlaceholder(left, PLACEHOLDERS.left);
setupPlaceholder(right, PLACEHOLDERS.right);

function handleInput(source, target, direction) {
    if (lock === target) return;
    lock = source;
    
    const value = getValue(source === 'left' ? left : right);
    const out = processText(value, direction);
    setValue(source === 'left' ? right : left, out);
    
    lock = null;
}

left.addEventListener("input", () => handleInput('left', 'right', 'decode'));
right.addEventListener("input", () => handleInput('right', 'left', 'encode'));

document.addEventListener('paste', (e) => {
    setTimeout(() => {
        if (e.target === left) {
            handleInput('left', 'right', 'decode');
        } else if (e.target === right) {
            handleInput('right', 'left', 'encode');
        }
    }, 10);
});