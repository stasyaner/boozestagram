import * as tf from '@tensorflow/tfjs';
import * as ui from './ui';
import Pica from 'pica';

const pica = new Pica();
const NUM_CLASSES = 2;

class DataLoader {
  constructor() {
    this.imagesArr = [];
    this.labelsArr = [];
  }

  async load() {
    const labelRequest = fetch('booze_dataset/labels.json').then(res => res.json()).then(res => {
      this.labelsArr = res;
    });

    const requests = [labelRequest];
    for (let i = 0; i < 35; i += 1) {
      const newImg = new Image();
      const newCv = document.createElement('canvas');
      newCv.width = 28;
      newCv.height = 28;
      requests.push(new Promise(resolve => {
        newImg.onload = () => {
          pica.resize(newImg, newCv).then(resCv => {
            this.imagesArr[i] = resCv;
            resolve();
          });
        };
        newImg.src = `booze_dataset/file${i + 1}.jpg`;
      }));
    }

    await Promise.all(requests);
  }

  nextBatch(batchSize) {
    let xs;
    let labels;

    for (let i = 0; i < batchSize; i += 1) {
      const imageNum = Math.floor(Math.random() * 35);

      if (xs) {
        xs = tf.concat([xs, tf.fromPixels(this.imagesArr[imageNum])]).asType('float32');
      } else {
        xs = tf.fromPixels(this.imagesArr[imageNum]).asType('float32');
      }

      let testL;
      if (this.labelsArr[imageNum] === 0) {
        testL = [1, 0];
      } else {
        testL = [0, 1];
      }
      if (labels) {
        labels = tf.concat([labels, tf.tensor2d(testL, [1, NUM_CLASSES])]);
      } else {
        labels = tf.tensor2d(testL, [1, NUM_CLASSES]);
      }
    };
    return { xs, labels };
  }
}

const model = tf.sequential();
model.add(tf.layers.conv2d({
  inputShape: [28, 28, 3],
  kernelSize: 5,
  filters: 8,
  strides: 1,
  activation: 'relu',
  kernelInitializer: 'varianceScaling'
}));
model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
model.add(tf.layers.conv2d({
  kernelSize: 5,
  filters: 16,
  strides: 1,
  activation: 'relu',
  kernelInitializer: 'varianceScaling',
}));
model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
model.add(tf.layers.flatten());
model.add(tf.layers.dense({
  units: NUM_CLASSES,
  kernelInitializer: 'varianceScaling',
  activation: 'softmax',
}));

const LEARNING_RATE = 0.15;
const optimizer = tf.train.sgd(LEARNING_RATE);
model.compile({
  optimizer: optimizer,
  loss: 'categoricalCrossentropy',
  metrics: ['accuracy'],
});

const BATCH_SIZE = 64;
const TRAIN_BATCHES = 150;

// Every few batches, test accuracy over many examples. Ideally, we'd compute
// accuracy over the whole test set, but for performance we'll use a subset.
const TEST_BATCH_SIZE = 100;
const TEST_ITERATION_FREQUENCY = 5;

async function train() {
  ui.isTraining();

  const lossValues = [];
  const accuracyValues = [];

  for (let i = 0; i < TRAIN_BATCHES; i++) {
    const batch = data.nextBatch(BATCH_SIZE);

    let testBatch;
    let validationData;
    // Every few batches test the accuracy of the mode.
    if (i % TEST_ITERATION_FREQUENCY === 0) {
      testBatch = data.nextBatch(TEST_BATCH_SIZE);
      validationData = [testBatch.xs.reshape([TEST_BATCH_SIZE, 28, 28, 3]), testBatch.labels];
    }

    // The entire dataset doesn't fit into memory so we call fit repeatedly
    // with batches.
    const history = await model.fit(
        batch.xs.reshape([BATCH_SIZE, 28, 28, 3]), batch.labels,
        { batchSize: BATCH_SIZE, validationData, epochs: 1 });

    const loss = history.history.loss[0];
    const accuracy = history.history.acc[0];

    // Plot loss / accuracy.
    lossValues.push({ 'batch': i, 'loss': loss, 'set': 'train' });
    ui.plotLosses(lossValues);

    if (testBatch != null) {
      accuracyValues.push({ 'batch': i, 'accuracy': accuracy, 'set': 'train' });
      ui.plotAccuracies(accuracyValues);
    }

    batch.xs.dispose();
    batch.labels.dispose();
    if (testBatch != null) {
      testBatch.xs.dispose();
      testBatch.labels.dispose();
    }

    await tf.nextFrame();
  }
}

async function showPredictions() {
  const testExamples = 10;
  const batch = data.nextBatch(testExamples);

  tf.tidy(() => {
    const output = model.predict(batch.xs.reshape([-1, 28, 28, 3]));

    const axis = 1;
    const labels = Array.from(batch.labels.argMax(axis).dataSync());
    const predictions = Array.from(output.argMax(axis).dataSync());

    // ui.showTestResults(batch, predictions, labels, testExamples);
  });
}


let data;
async function load() {
  data = new DataLoader();
  await data.load();
}

async function mnist() {
  await load();
  await train();
  showPredictions();
}

mnist();
