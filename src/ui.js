import embed from 'vega-embed';

const statusElement = document.getElementById('status');
const messageElement = document.getElementById('message');
const imagesElement = document.getElementById('images');

export function isTraining() {
  statusElement.innerText = 'Training...';
}
export function trainingLog(message) {
  messageElement.innerText = `${message}\n`;
  console.log(message);
}

export function showTestResults(batch, predictions, labels) {
  statusElement.innerText = 'Testing...';

  const testExamples = batch.xs.shape[0];
  batch.xs.print();
  for (let i = 0; i < testExamples; i += 1) {
    const image = batch.xs.slice([i, 0], [1, batch.xs.shape[1]]);

    const div = document.createElement('div');
    div.className = 'pred-container';

    const canvas = document.createElement('canvas');
    draw(image.flatten(), canvas);

    const pred = document.createElement('div');

    const prediction = predictions[i];
    const label = labels[i];
    const correct = prediction === label;

    pred.className = `pred ${(correct ? 'pred-correct' : 'pred-incorrect')}`;
    pred.innerText = `pred: ${prediction ? 'wine' : 'beer'}`;

    div.appendChild(pred);
    div.appendChild(canvas);

    imagesElement.appendChild(div);
  }
}

const lossLabelElement = document.getElementById('loss-label');
const accuracyLabelElement = document.getElementById('accuracy-label');
export function plotLosses(lossValues) {
  embed(
      '#lossCanvas', {
        '$schema': 'https://vega.github.io/schema/vega-lite/v2.json',
        'data': {'values': lossValues},
        'mark': {'type': 'line'},
        'width': 260,
        'orient': 'vertical',
        'encoding': {
          'x': {'field': 'batch', 'type': 'quantitative'},
          'y': {'field': 'loss', 'type': 'quantitative'},
          'color': {'field': 'set', 'type': 'nominal', 'legend': null},
        }
      },
      {width: 360});
  lossLabelElement.innerText =
      'last loss: ' + lossValues[lossValues.length - 1].loss.toFixed(2);
}

export function plotAccuracies(accuracyValues) {
  embed(
      '#accuracyCanvas', {
        '$schema': 'https://vega.github.io/schema/vega-lite/v2.json',
        'data': {'values': accuracyValues},
        'width': 260,
        'mark': {'type': 'line', 'legend': null},
        'orient': 'vertical',
        'encoding': {
          'x': {'field': 'batch', 'type': 'quantitative'},
          'y': {'field': 'accuracy', 'type': 'quantitative'},
          'color': {'field': 'set', 'type': 'nominal', 'legend': null},
        }
      },
      {'width': 360});
  accuracyLabelElement.innerText = 'last accuracy: ' +
      (accuracyValues[accuracyValues.length - 1].accuracy * 100).toFixed(2) +
      '%';
}

export function draw(image, canvas) {
  const [width, height] = [28, 28];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(width, height);
  const data = image.dataSync();
  let j = 0;
  let k = 0;
  for (let i = 0; i < height * width * 4; i += 1) {
    if ((i > 0) && (i % (3 + k) === 0)) {
      imageData.data[i] = 255;
      k += 4;
      continue;
    }
    imageData.data[i] = data[j] * 255;
    j += 1;
  }
  ctx.putImageData(imageData, 0, 0);
}
