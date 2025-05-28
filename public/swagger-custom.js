window.addEventListener('load', function () {
  console.log("🔥 Custom JS loaded!");

  const interval = setInterval(() => {
    const container = document.querySelector('.swagger-ui .scheme-container .auth-wrapper');
    console.log("✅ Interval running");

    if (container && !document.getElementById('downloadOpenApiButton')) {
      console.log("🎯 Container ditemukan");

      const downloadButton = document.createElement('button');
      downloadButton.id = 'downloadOpenApiButton';
      downloadButton.className = 'download-openapi-btn';
      downloadButton.style.display = 'flex';
      downloadButton.style.alignItems = 'center';
      downloadButton.style.gap = '6px';
      downloadButton.style.marginLeft = '10px';
      downloadButton.style.padding = '6px 12px';
      downloadButton.style.backgroundColor = '#007bff';
      downloadButton.style.color = '#fff';
      downloadButton.style.border = 'none';
      downloadButton.style.borderRadius = '4px';
      downloadButton.style.cursor = 'pointer';
      downloadButton.style.fontSize = '14px';

      downloadButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.6a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V10.4a.5.5 0 0 1 1 0v2.6A1.5 1.5 0 0 1 15 14.5H1A1.5 1.5 0 0 1-.5 13V10.4a.5.5 0 0 1 .5-.5z"/>
          <path d="M7.646 10.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 1 0-.708-.708L8.5 9.293V1.5a.5.5 0 0 0-1 0v7.793L5.354 7.146a.5.5 0 1 0-.708.708l3 3z"/>
        </svg>
        <span>Download OpenAPI JSON</span>
      `;

      downloadButton.onclick = function () {
        window.location.href = '/openapi.json';
      };

      container.appendChild(downloadButton);
      clearInterval(interval);
    }
  }, 300);
});
