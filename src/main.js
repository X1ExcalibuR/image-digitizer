// Variables globales
let originalImage = null;
let originalImageData = null; // Para guardar los datos originales del canvas
let originalFileSize = 0;

// Elementos del DOM
const imageUpload = document.getElementById('imageUpload');
const bitsSelector = document.getElementById('bitsSelector');
const applyBtn = document.getElementById('applyBtn');
const originalCanvas = document.getElementById('originalCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const resolutionSpan = document.getElementById('resolution');
const originalDepthSpan = document.getElementById('originalDepth');
const newDepthSpan = document.getElementById('newDepth');
const originalSizeSpan = document.getElementById('originalSize');
const newSizeSpan = document.getElementById('newSize');
const compressedSizeSpan = document.getElementById('compressedSize');
const compressionRatioSpan = document.getElementById('compressionRatio');

// Contextos de los canvas
let originalCtx = originalCanvas.getContext('2d');
let processedCtx = processedCanvas.getContext('2d');

// Evento: cargar imagen
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    originalFileSize = file.size;
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Configurar canvas al tamaño de la imagen
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            processedCanvas.width = img.width;
            processedCanvas.height = img.height;
            
            // Dibujar imagen original
            originalCtx.drawImage(img, 0, 0);
            
            // Guardar copia de los datos originales
            originalImageData = originalCtx.getImageData(0, 0, img.width, img.height);
            
            // Actualizar métricas iniciales
            updateMetricsInitial(img.width, img.height);
            
            // Mostrar que la imagen está cargada
            applyBtn.disabled = false;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Evento: botón digitalizar
applyBtn.addEventListener('click', () => {
    if (!originalImageData) {
        alert('Primero carga una imagen');
        return;
    }
    
    const bits = parseInt(bitsSelector.value);
    const processedData = cuantizarImagen(originalImageData, bits);
    
    // Mostrar imagen procesada
    processedCanvas.width = processedData.width;
    processedCanvas.height = processedData.height;
    processedCtx.putImageData(processedData, 0, 0);
    
    // Actualizar métricas después de la conversión
    updateMetricsAfterConversion(bits, processedData);
});

// Función principal: CUANTIZACIÓN (reducir profundidad de bits)
function cuantizarImagen(imageData, bitsPorPixel) {
    // Creamos una copia para no modificar la original
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );
    
    const data = newImageData.data;
    
    // Calcular niveles por canal de color
    // bitsPorPixel puede ser 24 (8 por canal), 16 (5-6-5), 8 (3-3-2), 4, 2, 1
    let bitsPorCanal;
    
    if (bitsPorPixel === 24) {
        // Sin cambios, es el original
        return newImageData;
    } else if (bitsPorPixel === 16) {
        // 5 bits para R, 6 para G, 5 para B (formato 565)
        bitsPorCanal = { r: 5, g: 6, b: 5 };
    } else if (bitsPorPixel === 8) {
        // 3 bits R, 3 bits G, 2 bits B
        bitsPorCanal = { r: 3, g: 3, b: 2 };
    } else {
        // Para 4, 2, 1 bits: distribuimos equitativamente
        const bitsPorCanalTotal = Math.floor(bitsPorPixel / 3);
        bitsPorCanal = { r: bitsPorCanalTotal, g: bitsPorCanalTotal, b: bitsPorCanalTotal };
    }
    
    // Aplicar cuantización
    for (let i = 0; i < data.length; i += 4) {
        // Canal Rojo
        if (bitsPorCanal.r > 0) {
            const nivelesR = Math.pow(2, bitsPorCanal.r);
            const factorR = 256 / nivelesR;
            data[i] = Math.floor(data[i] / factorR) * factorR;
        } else {
            data[i] = 0;
        }
        
        // Canal Verde
        if (bitsPorCanal.g > 0) {
            const nivelesG = Math.pow(2, bitsPorCanal.g);
            const factorG = 256 / nivelesG;
            data[i+1] = Math.floor(data[i+1] / factorG) * factorG;
        } else {
            data[i+1] = 0;
        }
        
        // Canal Azul
        if (bitsPorCanal.b > 0) {
            const nivelesB = Math.pow(2, bitsPorCanal.b);
            const factorB = 256 / nivelesB;
            data[i+2] = Math.floor(data[i+2] / factorB) * factorB;
        } else {
            data[i+2] = 0;
        }
        
        // Caso especial: 1 bit (blanco y negro)
        if (bitsPorPixel === 1) {
            const gris = (data[i] + data[i+1] + data[i+2]) / 3;
            const valor = gris > 127 ? 255 : 0;
            data[i] = valor;
            data[i+1] = valor;
            data[i+2] = valor;
        }
    }
    
    return newImageData;
}

// Actualizar métricas iniciales (cuando se carga la imagen)
function updateMetricsInitial(width, height) {
    resolutionSpan.textContent = `${width} x ${height} px (${width * height} MP)`;
    originalDepthSpan.textContent = '24 bits (original)';
    originalSizeSpan.textContent = formatBytes(originalFileSize);
    
    // Inicializar las otras métricas
    newDepthSpan.textContent = '-';
    newSizeSpan.textContent = '-';
    compressedSizeSpan.textContent = '-';
    compressionRatioSpan.textContent = '-';
}

// Actualizar métricas después de la conversión
function updateMetricsAfterConversion(bits, processedData) {
    // Actualizar profundidad
    newDepthSpan.textContent = `${bits} bits (${Math.pow(2, bits)} colores máximos)`;
    
    // Calcular tamaño de la imagen digitalizada (sin comprimir)
    const rawSize = processedData.data.length; // bytes (RGBA)
    const sizeWithoutAlpha = rawSize * 0.75; // Solo RGB
    newSizeSpan.textContent = formatBytes(sizeWithoutAlpha);
    
    // Calcular compresión RLE simulada
    const rleResult = comprimirRLE(processedData.data);
    compressedSizeSpan.textContent = formatBytes(rleResult.compressedSize);
    
    // Calcular factor de compresión
    const ratio = ((rawSize - rleResult.compressedSize) / rawSize * 100).toFixed(2);
    compressionRatioSpan.textContent = `${ratio}% (ahorro)`;
}

// Algoritmo de compresión RLE (Run-Length Encoding)
function comprimirRLE(data) {
    let compressedSize = 0;
    let count = 1;
    
    for (let i = 0; i < data.length - 4; i += 4) {
        // Comparamos píxel actual con el siguiente (solo RGB, ignoramos alpha)
        if (data[i] === data[i+4] && 
            data[i+1] === data[i+5] && 
            data[i+2] === data[i+6]) {
            count++;
        } else {
            // Cada par (valor, repetición) ocupa 2 bytes
            compressedSize += 2;
            count = 1;
        }
    }
    compressedSize += 2; // Último grupo
    
    return {
        compressedSize: compressedSize,
        compressionRatio: (compressedSize / data.length * 100).toFixed(2)
    };
}

// Utilidad: formatear bytes a KB/MB
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Deshabilitar botón hasta cargar imagen
applyBtn.disabled = true;