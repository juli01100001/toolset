class AutoWebDecoder {
    constructor() {
        this.delimiters = ['.', '-', '_'];
        this.debounceTimer = null;
        this.debounceDelay = 500;
    }

    detectAndDecodeAll(input) {
        const results = {
            timestamp: new Date().toLocaleTimeString(),
            inputLength: input.length,
            detectedType: 'unknown',
            methods: []
        };

        if (!input || input.trim().length === 0) {
            return results;
        }


        const hasDots = input.includes('.');

        if (hasDots) {

            const parts = input.split('.');
            const decodedParts = [];
            let successCount = 0;

            parts.forEach((part, index) => {
                try {

                    const decoded = this.decodeBase64(part);
                    if (decoded && decoded !== part) {
                        decodedParts.push(decoded);
                        successCount++;
                    } else {
                        decodedParts.push(part);
                    }
                } catch (e) {

                    try {
                        const urlDecoded = decodeURIComponent(part.replace(/\+/g, ' '));
                        if (urlDecoded !== part) {
                            decodedParts.push(urlDecoded);
                            successCount++;
                        } else {
                            decodedParts.push(part);
                        }
                    } catch (e2) {
                        decodedParts.push(part);
                    }
                }
            });


            if (successCount > 0) {
                results.detectedType = 'mixed_parts';
                results.methods.push({
                    type: 'mixed_decoding',
                    success: true,
                    content: `DECODED ${successCount}/${parts.length} PARTS:\n\n${decodedParts.map((part, i) => `[PART ${i + 1}]: ${part}`).join('\n\n')}`
                });
                return results;
            }
        }




        if (input.split('.').length === 3 && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(input)) {
            const jwtResult = this.tryJWT(input);
            if (jwtResult.success) {
                results.detectedType = 'JWT';
                results.methods.push(jwtResult);
                return results;
            }
        }


        let bestResult = null;
        let bestScore = 0;


        try {
            const decoded = this.decodeBase64(input);
            if (decoded && decoded !== input) {
                const score = this.calculateDecodeScore(decoded);
                if (score > bestScore) {
                    bestScore = score;
                    bestResult = {
                        type: 'base64',
                        success: true,
                        content: decoded,
                        info: 'Standard Base64 decode'
                    };
                }
            }
        } catch (e) { }


        try {
            const decoded = this.decodeBase64URL(input);
            if (decoded && decoded !== input) {
                const score = this.calculateDecodeScore(decoded);
                if (score > bestScore) {
                    bestScore = score;
                    bestResult = {
                        type: 'base64url',
                        success: true,
                        content: decoded,
                        info: 'Base64URL (URL-safe) decode'
                    };
                }
            }
        } catch (e) { }


        try {
            const decoded = decodeURIComponent(input.replace(/\+/g, ' '));
            if (decoded !== input) {
                const score = this.calculateDecodeScore(decoded);
                if (score > bestScore) {
                    bestScore = score;
                    bestResult = {
                        type: 'url',
                        success: true,
                        content: decoded,
                        info: 'URL percent decode'
                    };
                }
            }
        } catch (e) { }


        const cleanHex = input.replace(/[^0-9a-f]/gi, '');
        if (cleanHex.length % 2 === 0 && cleanHex.length > 0) {
            try {
                let decoded = '';
                for (let i = 0; i < cleanHex.length; i += 2) {
                    decoded += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
                }
                if (decoded) {
                    const score = this.calculateDecodeScore(decoded);
                    if (score > bestScore) {
                        bestScore = score;
                        bestResult = {
                            type: 'hex',
                            success: true,
                            content: decoded,
                            info: 'Hexadecimal decode'
                        };
                    }
                }
            } catch (e) { }
        }


        if (bestResult && bestScore > 0.3) {
            results.detectedType = bestResult.type;
            results.methods.push(bestResult);
            return results;
        }


        results.detectedType = 'raw_text';
        results.methods.push({
            type: 'raw_text',
            success: true,
            
        });

        return results;
    }

    tryJWT(input) {
        if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(input)) {
            return { type: 'jwt', success: false, error: 'Not a JWT format' };
        }

        const parts = input.split('.');
        if (parts.length !== 3) {
            return { type: 'jwt', success: false, error: 'Invalid JWT segments' };
        }

        try {
            const [headerB64, payloadB64, signature] = parts;
            const header = this.decodeBase64JSON(headerB64);
            const payload = this.decodeBase64JSON(payloadB64);

            return {
                type: 'jwt',
                success: true,
                header: header,
                payload: payload,
                signature: signature,
                content: `JWT DECODED:\n\nHEADER:\n${JSON.stringify(header, null, 2)}\n\nPAYLOAD:\n${JSON.stringify(payload, null, 2)}\n\nSIGNATURE: ${signature}`
            };
        } catch (error) {
            return { type: 'jwt', success: false, error: error.message };
        }
    }

    tryBase64All(input) {
        const results = [];


        try {
            const decoded = this.decodeBase64(input);
            if (decoded && decoded !== input) {
                results.push({
                    type: 'base64_standard',
                    success: true,
                    content: decoded,
                    info: 'Standard Base64 decode'
                });
            }
        } catch (e) { }


        try {
            const decoded = this.decodeBase64URL(input);
            if (decoded && decoded !== input) {
                results.push({
                    type: 'base64url',
                    success: true,
                    content: decoded,
                    info: 'Base64URL (URL-safe) decode'
                });
            }
        } catch (e) { }


        if (!input.includes('=')) {
            try {
                const withPadding = input + '==';
                const decoded = this.decodeBase64(withPadding);
                if (decoded && decoded !== input) {
                    results.push({
                        type: 'base64_with_padding',
                        success: true,
                        content: decoded,
                        info: 'Base64 with added padding'
                    });
                }
            } catch (e) { }
        }


        this.delimiters.forEach(delimiter => {
            if (input.includes(delimiter)) {
                const parts = input.split(delimiter);
                const decodedParts = [];
                let allDecoded = true;

                parts.forEach(part => {
                    try {
                        const decoded = this.decodeBase64(part);
                        decodedParts.push(decoded);
                    } catch (e) {
                        decodedParts.push(part);
                        allDecoded = false;
                    }
                });

                if (allDecoded || decodedParts.some(p => p !== input)) {
                    results.push({
                        type: `delimited_base64_${delimiter}`,
                        success: true,
                        content: decodedParts.join(' '),
                        info: `Base64 split by "${delimiter}" delimiter`
                    });
                }
            }
        });

        return results;
    }

    tryURLAll(input) {
        const results = [];


        try {
            const decoded = decodeURIComponent(input.replace(/\+/g, ' '));
            if (decoded !== input) {
                results.push({
                    type: 'url_decode',
                    success: true,
                    content: decoded,
                    info: 'URL percent decode'
                });
            }
        } catch (e) { }


        let current = input;
        for (let i = 0; i < 3; i++) {
            try {
                current = decodeURIComponent(current.replace(/\+/g, ' '));
                if (current !== input) {
                    results.push({
                        type: `url_decode_nested_${i + 1}`,
                        success: true,
                        content: current,
                        info: `URL decode ${i + 1} layers deep`
                    });
                }
            } catch (e) {
                break;
            }
        }

        return results;
    }

    tryHexAll(input) {
        const results = [];
        const cleanHex = input.replace(/[^0-9a-f]/gi, '');

        if (cleanHex.length % 2 === 0 && cleanHex.length > 0) {
            try {
                let decoded = '';
                for (let i = 0; i < cleanHex.length; i += 2) {
                    decoded += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
                }

                if (decoded && decoded.length > 0) {
                    results.push({
                        type: 'hex_decode',
                        success: true,
                        content: decoded,
                        info: 'Hexadecimal decode'
                    });
                }
            } catch (e) { }
        }

        return results;
    }

    tryJSON(input) {
        try {
            const parsed = JSON.parse(input);
            return {
                type: 'json',
                success: true,
                content: JSON.stringify(parsed, null, 2),
                info: 'Valid JSON (already decoded)'
            };
        } catch (e) {
            return { type: 'json', success: false, error: 'Not valid JSON' };
        }
    }

    decodeBase64(str) {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }

        try {
            return decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        } catch (e) {
            return atob(base64);
        }
    }

    decodeBase64URL(str) {
        const standard = str.replace(/-/g, '+').replace(/_/g, '/');
        return this.decodeBase64(standard);
    }

    decodeBase64JSON(b64) {
        const decoded = this.decodeBase64(b64);
        return JSON.parse(decoded);
    }
    calculateDecodeScore(decodedText) {
        if (!decodedText || decodedText.length === 0) return 0;


        const printable = decodedText.match(/[\x20-\x7E\t\n\r]/g);
        if (!printable) return 0;

        const printableRatio = printable.length / decodedText.length;


        let bonus = 0;
        if (/^https?:\/\//i.test(decodedText)) bonus += 0.3;
        if (/^[\s\r\n]*[{\[].*[}\]]/s.test(decodedText)) bonus += 0.2;
        if (decodedText.includes('{') && decodedText.includes('}')) bonus += 0.1;

        return Math.min(1, printableRatio + bonus);
    }
}


const decoder = new AutoWebDecoder();
const input = document.getElementById('input');
const output = document.getElementById('output');


input.addEventListener('input', () => {

    document.getElementById('charCount').textContent = input.value.length;
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    document.getElementById('status').textContent = 'PROCESSING';
    document.getElementById('status').style.color = '#f39c12';


    if (decoder.debounceTimer) {
        clearTimeout(decoder.debounceTimer);
    }


    decoder.debounceTimer = setTimeout(() => {
        performAutoDecode();
    }, decoder.debounceDelay);
});

function performAutoDecode() {
    const inputText = input.value.trim();

    if (!inputText) {
        output.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #95a5a6;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                        <h3>Waiting for input...</h3>
                        <p>Paste encoded data in the left panel</p>
                    </div>
                `;

        document.getElementById('detectedType').textContent = '-';
        document.getElementById('methodCount').textContent = '0';
        document.getElementById('successCount').textContent = '0';
        document.getElementById('status').textContent = 'IDLE';
        document.getElementById('status').style.color = '#7f8c8d';
        return;
    }

    try {
        const results = decoder.detectAndDecodeAll(inputText);


        document.getElementById('detectedType').textContent = results.detectedType;
        document.getElementById('methodCount').textContent = results.methods.length;
        const successful = results.methods.filter(m => m.success).length;
        document.getElementById('successCount').textContent = successful;
        document.getElementById('status').textContent = 'DONE';
        document.getElementById('status').style.color = '#27ae60';


        displayResults(results);
    } catch (error) {
        output.innerHTML = `
                    <div class="error">
                        <h3>Decoding Error</h3>
                        <pre>${error.message}</pre>
                    </div>
                `;

        document.getElementById('status').textContent = 'ERROR';
        document.getElementById('status').style.color = '#e74c3c';
    }
}

function displayResults(results) {
    let html = '';
    const successfulMethods = results.methods.filter(m => m.success);

    if (successfulMethods.length === 0) {
        html += `
                    <div>
                        <h3>no successful decodes found</h3>
                       
                    </div>
                `;
    } else {

        const grouped = {};
        successfulMethods.forEach(method => {
            if (!grouped[method.type]) {
                grouped[method.type] = [];
            }
            grouped[method.type].push(method);
        });


        if (grouped.jwt) {
            const jwt = grouped.jwt[0];
            html += `
                        <div class="decoding-section jwt-section">
                            <div class="decoding-header">
                                JSON WEB TOKEN (JWT)
                            </div>
                            <div class="decoding-content">
                                ${jwt.content}
                            </div>
                        </div>
                    `;
            delete grouped.jwt;
        }


        if (grouped.json) {
            const json = grouped.json[0];
            html += `
                        <div class="decoding-section json-section">
                            <div class="decoding-header">
                                📄 JSON DOCUMENT
                            </div>
                            <div class="decoding-content">
                                ${json.content}
                            </div>
                        </div>
                    `;
            delete grouped.json;
        }


        Object.keys(grouped).forEach(type => {
            grouped[type].forEach((method, index) => {
                let typeName = type;

                if (type.includes('base64')) {
                    typeName = 'BASE64';
                } else if (type.includes('url')) {
                    typeName = 'URL ENCODED';
                } else if (type.includes('hex')) {
                    typeName = 'HEXADECIMAL';
                }

                html += `
                            <div class="decoding-section ${type.includes('base64') ? 'base64-section' : type.includes('url') ? 'url-section' : 'hex-section'}">
                                <div class="decoding-header">
                                     ${typeName.toUpperCase()} ${grouped[type].length > 1 ? `(${index + 1}/${grouped[type].length})` : ''}
                                    <span style="float: right; font-size: 11px; font-weight: normal; color: #7f8c8d;">
                                        ${method.info}
                                    </span>
                                </div>
                                <div class="decoding-content">
                                    ${method.content}
                                </div>
                            </div>
                        `;
            });
        });
    }



    output.innerHTML = html;
}