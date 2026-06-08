// Variables globales
let originalImageObj = null;      // Imagen original
let originalFileSize = 0;
let originalWidth = 0, originalHeight = 0;

// Variables para almacenar el último resultado digitalizado y su compresión
let lastQuantizedImageData = null;   // ImageData de la imagen final (muestreada + cuantizada)
let lastCompressedData = null;       // Uint8Array con los datos comprimidos en RLE
let lastCompressedSize = 0;

// Elementos del DOM
const imageUpload = document.getElementById('imageUpload');
const bitsSelector = document.getElementById('bitsSelector');
const resampleSelector = document.getElementById('resampleSelector');
const applyBtn = document.getElementById('applyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const originalCanvas = document.getElementById('originalCanvas');
const processedCanvas = document.getElementById('processedCanvas');

// Métricas
const originalResolutionSpan = document.getElementById('originalResolution');
const newResolutionSpan = document.getElementById('newResolution');
const originalDepthSpan = document.getElementById('originalDepth');
const newDepthSpan = document.getElementById('newDepth');
const originalSizeSpan = document.getElementById('originalSize');
const uncompressedSizeSpan = document.getElementById('uncompressedSize');
const compressedSizeSpan = document.getElementById('compressedSize');
const compressionRatioSpan = document.getElementById('compressionRatio');

// Contextos
let originalCtx = originalCanvas.getContext('2d');
let processedCtx = processedCanvas.getContext('2d');

// ------------------------------------------------------------------
// Cargar imagen
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    originalFileSize = file.size;
    const reader = new FileReader();

    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            originalImageObj = img;
            originalWidth = img.width;
            originalHeight = img.height;

            originalCanvas.width = originalWidth;
            originalCanvas.height = originalHeight;
            originalCtx.drawImage(img, 0, 0);

            // Métricas iniciales
            originalResolutionSpan.textContent = `${originalWidth} x ${originalHeight} px`;
            originalDepthSpan.textContent = '24 bits';
            originalSizeSpan.textContent = formatBytes(originalFileSize);
            
            // Limpiar métricas secundarias
            newResolutionSpan.textContent = '-';
            newDepthSpan.textContent = '-';
            uncompressedSizeSpan.textContent = '-';
            compressedSizeSpan.textContent = '-';
            compressionRatioSpan.textContent = '-';
            
            processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
            applyBtn.disabled = false;
            downloadBtn.disabled = true;  // No hay datos comprimidos aún
            lastQuantizedImageData = null;
            lastCompressedData = null;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// ------------------------------------------------------------------
// Botón Digitalizar (muestreo + cuantización + compresión real)
applyBtn.addEventListener('click', () => {
    if (!originalImageObj) {
        alert('Primero carga una imagen');
        return;
    }

    const scale = parseFloat(resampleSelector.value);
    let newWidth = Math.floor(originalWidth * scale);
    let newHeight = Math.floor(originalHeight * scale);
    if (newWidth < 1) newWidth = 1;
    if (newHeight < 1) newHeight = 1;

    // 1. Muestreo: redimensionar
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImageObj, 0, 0, newWidth, newHeight);
    const sampledImageData = tempCtx.getImageData(0, 0, newWidth, newHeight);
    
    // 2. Cuantización
    const bits = parseInt(bitsSelector.value);
    const quantizedImageData = cuantizarImageData(sampledImageData, bits);
    lastQuantizedImageData = quantizedImageData;  // guardar para posible descarga
    
    // Mostrar en canvas
    processedCanvas.width = newWidth;
    processedCanvas.height = newHeight;
    processedCtx.putImageData(quantizedImageData, 0, 0);
    
    // 3. Compresión RLE REAL sobre los datos cuantizados (solo RGB)
    const compressedArray = comprimirRLE_real(quantizedImageData);
    lastCompressedData = compressedArray;
    lastCompressedSize = compressedArray.length;
    
    // 4. Actualizar métricas
    newResolutionSpan.textContent = `${newWidth} x ${newHeight} px`;
    newDepthSpan.textContent = `${bits} bits`;
    
    const uncompressedBytes = newWidth * newHeight * 3; // RGB
    uncompressedSizeSpan.textContent = formatBytes(uncompressedBytes);
    compressedSizeSpan.textContent = formatBytes(lastCompressedSize);
    
    const ratio = ((uncompressedBytes - lastCompressedSize) / uncompressedBytes * 100).toFixed(2);
    compressionRatioSpan.textContent = `${ratio}% de ahorro`;
    
    // Habilitar botón de descarga
    downloadBtn.disabled = false;
});

// ------------------------------------------------------------------
// Compresión RLE real: genera un Uint8Array con el formato [R, G, B, count] por cada run
function comprimirRLE_real(imageData) {
    const data = imageData.data; // RGBA, pero ignoramos alpha
    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;
    
    let runs = []; // almacenaremos objetos o directamente bytes
    
    let i = 0;
    while (i < totalPixels) {
        const r = data[i*4];
        const g = data[i*4+1];
        const b = data[i*4+2];
        let count = 1;
        let j = i + 1;
        while (j < totalPixels && 
               data[j*4] === r && 
               data[j*4+1] === g && 
               data[j*4+2] === b && 
               count < 255) {   // limitamos count a 255 para caber en 1 byte
            count++;
            j++;
        }
        runs.push(r, g, b, count);
        i = j;
    }
    
    return new Uint8Array(runs);
}

// ------------------------------------------------------------------
// Descargar el archivo comprimido (extensión .rle)
downloadBtn.addEventListener('click', () => {
    if (!lastCompressedData) {
        alert('Primero digitalizá una imagen (botón "Digitalizar imagen")');
        return;
    }
    
    const blob = new Blob([lastCompressedData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imagen_digitalizada_${Date.now()}.rle`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// ------------------------------------------------------------------
// Función de cuantización (igual que antes, pero adaptada para trabajar sobre ImageData)
function cuantizarImageData(imageData, bitsPorPixel) {
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );
    const data = newImageData.data;
    
    if (bitsPorPixel === 24) return newImageData;
    
    let bitsPorCanal;
    if (bitsPorPixel === 16) {
        bitsPorCanal = { r: 5, g: 6, b: 5 };
    } else if (bitsPorPixel === 8) {
        bitsPorCanal = { r: 3, g: 3, b: 2 };
    } else if (bitsPorPixel === 1) {
        for (let i = 0; i < data.length; i += 4) {
            const gris = (data[i] + data[i+1] + data[i+2]) / 3;
            const valor = gris > 127 ? 255 : 0;
            data[i] = valor;
            data[i+1] = valor;
            data[i+2] = valor;
        }
        return newImageData;
    } else {
        const bitsPorCanalTotal = Math.floor(bitsPorPixel / 3);
        bitsPorCanal = { r: bitsPorCanalTotal, g: bitsPorCanalTotal, b: bitsPorCanalTotal };
    }
    
    for (let i = 0; i < data.length; i += 4) {
        if (bitsPorCanal.r > 0) {
            const niveles = Math.pow(2, bitsPorCanal.r);
            const factor = 256 / niveles;
            data[i] = Math.floor(data[i] / factor) * factor;
        } else data[i] = 0;
        
        if (bitsPorCanal.g > 0) {
            const niveles = Math.pow(2, bitsPorCanal.g);
            const factor = 256 / niveles;
            data[i+1] = Math.floor(data[i+1] / factor) * factor;
        } else data[i+1] = 0;
        
        if (bitsPorCanal.b > 0) {
            const niveles = Math.pow(2, bitsPorCanal.b);
            const factor = 256 / niveles;
            data[i+2] = Math.floor(data[i+2] / factor) * factor;
        } else data[i+2] = 0;
    }
    return newImageData;
}

// ------------------------------------------------------------------
// Utilidad: formateo de bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Inicializar botones
applyBtn.disabled = true;
downloadBtn.disabled = true;
console.log('Video de development de la pagina: https://youtu.be/dQw4w9WgXcQ?si=gea92JEixiNuHLci');