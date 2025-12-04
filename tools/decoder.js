function decodeToken() {
    const tokenInput = document.getElementById('tokenInput').value.trim();
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    
    resultDiv.innerHTML = '';
    errorDiv.style.display = 'none';
    
    if (!tokenInput) {
        showError('Please enter a token');
        return;
    }

    if (!tokenInput.includes('.')) {
        showError('Invalid token format. Expected: TOKEN.ENCODED_URL');
        return;
    }

    const [tokenPart, encodedPart] = tokenInput.split('.');
    
    let decodedUrl;
    try {
        const base64String = encodedPart
            .replace(/_/g, '/')
            .replace(/-/g, '+');
        
        const padding = '==='.slice(0, (4 - base64String.length % 4) % 4);
        decodedUrl = atob(base64String + padding);
    } catch (e) {
        showError('Failed to decode URL: ' + e.message);
        return;
    }

    resultDiv.innerHTML = `
        <strong>Token:</strong><br>
        ${tokenPart}<br><br>
        
        <strong>Decoded URL:</strong><br>
        ${decodedUrl}<br><br>
        
        <strong>Full Proxy URL:</strong><br>
        https://proxy.example.com/api/proxy/${tokenInput}
    `;
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function clearAll() {
    document.getElementById('tokenInput').value = '';
    document.getElementById('result').innerHTML = '';
    document.getElementById('error').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('tokenInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            decodeToken();
        }
    });
});