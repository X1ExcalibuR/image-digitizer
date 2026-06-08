# Digitalizador de imagenes - TP Integrador

Este proyecto es una aplicación web desarrollada para la materia **Comunicación de Datos**, la cual permitira tomar imágenes en formato analógo, conviertirlas en datos digitales mediante muestreo y cuantización de color, dar una comparación entre las imágenes y mostrando además métricas relevantes del proceso.

## Grupo 1

**Integrantes:**
- Alegre Alexis
- Cruz Lucas
- Garcia Ignacio
- Sagasti Emilio
- Silva Manuel

**Comisión:** S31 | **Año de cursada:** 2026 | **Facultad:** UTN FRLP

## Caracteristicas

- **Carga de imágenes:** Se podra insertar cualquier imágen para su conversión y se respetara la resolución original de la misma
- **Selector de muestreo:** Elige una de las opciones para modificar la resolución la imagen digitalizada
- **Selector profundidad de bits/color:** Elige una de las opciones para modificar la cuantización de la imagen digitalizada
- **Metricas automáticas:** Se calculan y se muestran la resolución, profundidad de bits, tamaño original, tamaño convertido, tamaño comprimido y el factor de compresión
- **Comparación de imágenes:** Se muestra una vista de comparación clara entre la imágen original y la imágen con los artibutos seleccionados

## ¿Cómo usarlo?

1. Cargá una imagen, al hacerlo se visualizaran los metadatos de la misma.
2. Elegí un factor de muestreo y profundidad de bits.
3. Hacé clic en "Digitalizar imagen".
4. Se creara la imagen convertida y se observaran en el panel de métricas los nuevos datos.
5. Por ultimo, haz clic en "Descargar imagen comprimida" y se guardara un archivo .rle 

## Tecnologías utilizadas

- HTML5
- Tailwind CSS
- JavaScript