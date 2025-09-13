import { storage } from "../storage";
import type { InsertAiModel, AiModel } from "@shared/schema";
import { EventEmitter } from "events";
import { websocketService } from "./websocket";

export interface TrainingProgress {
  modelId: string;
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
  validationLoss: number;
  validationAccuracy: number;
  learningRate: number;
  estimatedTimeRemaining: number;
  status: 'initializing' | 'training' | 'validating' | 'completed' | 'failed';
  currentBatch: number;
  totalBatches: number;
}

export interface ModelMetrics {
  trainingHistory: {
    epoch: number;
    loss: number;
    accuracy: number;
    valLoss: number;
    valAccuracy: number;
  }[];
  confusionMatrix?: number[][];
  classificationReport?: {
    [className: string]: {
      precision: number;
      recall: number;
      f1Score: number;
      support: number;
    };
  };
  learningCurves: {
    epochs: number[];
    trainLoss: number[];
    valLoss: number[];
    trainAcc: number[];
    valAcc: number[];
  };
}

class AITrainingService extends EventEmitter {
  private activeTraining = new Map<string, NodeJS.Timeout>();
  private trainingProgress = new Map<string, TrainingProgress>();

  async startTraining(modelConfig: {
    name: string;
    type: 'CNN' | 'LSTM' | 'Transformer';
    architecture: string;
    epochs: number;
    batchSize: number;
    learningRate: number;
    datasetSize: number;
  }): Promise<string> {
    console.log(`🤖 Starting training for ${modelConfig.name}...`);
    
    // Create initial model record
    const modelData: InsertAiModel = {
      name: modelConfig.name,
      type: modelConfig.type,
      version: "v1.0.0",
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      trainingData: `Training on ${modelConfig.datasetSize} samples`,
      isActive: false,
      parameters: {
        architecture: modelConfig.architecture,
        epochs: modelConfig.epochs,
        batchSize: modelConfig.batchSize,
        learningRate: modelConfig.learningRate,
        optimizer: "Adam"
      }
    };

    const model = await storage.createAiModel(modelData);
    
    // Initialize training progress
    const progress: TrainingProgress = {
      modelId: model.id,
      epoch: 0,
      totalEpochs: modelConfig.epochs,
      loss: 0,
      accuracy: 0,
      validationLoss: 0,
      validationAccuracy: 0,
      learningRate: modelConfig.learningRate,
      estimatedTimeRemaining: modelConfig.epochs * 120, // 2 minutes per epoch estimate
      status: 'initializing',
      currentBatch: 0,
      totalBatches: Math.ceil(modelConfig.datasetSize / modelConfig.batchSize)
    };

    this.trainingProgress.set(model.id, progress);
    
    // Start training simulation
    this.simulateTraining(model.id, modelConfig);
    
    return model.id;
  }

  private async simulateTraining(modelId: string, config: any) {
    const progress = this.trainingProgress.get(modelId)!;
    const epochDuration = 120000; // 2 minutes per epoch
    const batchDuration = epochDuration / progress.totalBatches;

    progress.status = 'training';
    this.emit('trainingUpdate', progress);
    websocketService.broadcast('training_update', progress);

    const trainingInterval = setInterval(async () => {
      if (progress.currentBatch < progress.totalBatches) {
        // Update batch progress
        progress.currentBatch++;
        
        // Simulate realistic training metrics
        const epochProgress = progress.currentBatch / progress.totalBatches;
        const overallProgress = (progress.epoch + epochProgress) / progress.totalEpochs;
        
        // Generate realistic loss and accuracy curves
        progress.loss = this.generateLoss(overallProgress, config.type);
        progress.accuracy = this.generateAccuracy(overallProgress, config.type);
        progress.validationLoss = progress.loss + Math.random() * 0.1;
        progress.validationAccuracy = Math.max(0, progress.accuracy - Math.random() * 0.05);
        
        // Update time estimates
        const batchesRemaining = (progress.totalEpochs - progress.epoch - 1) * progress.totalBatches + 
                                (progress.totalBatches - progress.currentBatch);
        progress.estimatedTimeRemaining = batchesRemaining * (batchDuration / 1000);
        
        this.emit('trainingUpdate', progress);
      } else {
        // Move to next epoch
        progress.epoch++;
        progress.currentBatch = 0;
        
        if (progress.epoch >= progress.totalEpochs) {
          // Training completed
          clearInterval(trainingInterval);
          this.activeTraining.delete(modelId);
          
          progress.status = 'completed';
          progress.estimatedTimeRemaining = 0;
          
          // Update model with final metrics
          await this.finalizeModel(modelId, progress);
          
          this.emit('trainingComplete', { modelId, progress });
          console.log(`✅ Training completed for model ${modelId}`);
        } else {
          progress.status = 'validating';
          this.emit('trainingUpdate', progress);
          
          // Brief validation phase
          setTimeout(() => {
            progress.status = 'training';
            this.emit('trainingUpdate', progress);
          }, 5000);
        }
      }
    }, batchDuration);

    this.activeTraining.set(modelId, trainingInterval);
  }

  private generateLoss(progress: number, modelType: string): number {
    // Realistic loss curves based on model type
    const baseDecay = Math.exp(-progress * 3);
    const noise = (Math.random() - 0.5) * 0.1;
    
    switch (modelType) {
      case 'CNN':
        return 2.5 * baseDecay + 0.1 + noise;
      case 'LSTM':
        return 3.0 * baseDecay + 0.15 + noise;
      case 'Transformer':
        return 2.8 * baseDecay + 0.12 + noise;
      default:
        return 2.5 * baseDecay + 0.1 + noise;
    }
  }

  private generateAccuracy(progress: number, modelType: string): number {
    // Realistic accuracy curves with plateaus and improvements
    const baseGrowth = 1 - Math.exp(-progress * 2.5);
    const noise = (Math.random() - 0.5) * 0.02;
    
    switch (modelType) {
      case 'CNN':
        return Math.min(0.95, 0.3 + 0.65 * baseGrowth + noise);
      case 'LSTM':
        return Math.min(0.92, 0.25 + 0.67 * baseGrowth + noise);
      case 'Transformer':
        return Math.min(0.88, 0.2 + 0.68 * baseGrowth + noise);
      default:
        return Math.min(0.95, 0.3 + 0.65 * baseGrowth + noise);
    }
  }

  private async finalizeModel(modelId: string, progress: TrainingProgress) {
    // Calculate final metrics
    const finalAccuracy = progress.accuracy;
    const finalPrecision = finalAccuracy * (0.95 + Math.random() * 0.05);
    const finalRecall = finalAccuracy * (0.93 + Math.random() * 0.07);
    const finalF1 = 2 * (finalPrecision * finalRecall) / (finalPrecision + finalRecall);

    // Update model with final results
    await storage.updateAiModel(modelId, {
      accuracy: finalAccuracy,
      precision: finalPrecision,
      recall: finalRecall,
      f1Score: finalF1,
      isActive: true
    });
  }

  getTrainingProgress(modelId: string): TrainingProgress | undefined {
    return this.trainingProgress.get(modelId);
  }

  getAllActiveTraining(): TrainingProgress[] {
    return Array.from(this.trainingProgress.values()).filter(p => p.status !== 'completed');
  }

  async stopTraining(modelId: string): Promise<boolean> {
    const interval = this.activeTraining.get(modelId);
    if (interval) {
      clearInterval(interval);
      this.activeTraining.delete(modelId);
      
      const progress = this.trainingProgress.get(modelId);
      if (progress) {
        progress.status = 'failed';
        this.emit('trainingStopped', { modelId, progress });
      }
      
      return true;
    }
    return false;
  }

  async generateModelMetrics(modelId: string): Promise<ModelMetrics> {
    const model = await storage.getAiModel(modelId);
    if (!model) throw new Error('Model not found');

    // Generate realistic training history
    const epochs = model.parameters?.epochs || 50;
    const history = [];
    
    for (let epoch = 1; epoch <= epochs; epoch++) {
      const progress = epoch / epochs;
      history.push({
        epoch,
        loss: this.generateLoss(progress, model.type),
        accuracy: this.generateAccuracy(progress, model.type),
        valLoss: this.generateLoss(progress, model.type) + Math.random() * 0.1,
        valAccuracy: this.generateAccuracy(progress, model.type) - Math.random() * 0.05
      });
    }

    // Generate confusion matrix for classification models
    const numClasses = model.parameters?.classes || 10;
    const confusionMatrix = Array(numClasses).fill(0).map(() => 
      Array(numClasses).fill(0).map(() => Math.floor(Math.random() * 100))
    );

    // Enhance diagonal (correct predictions)
    for (let i = 0; i < numClasses; i++) {
      confusionMatrix[i][i] = Math.floor(confusionMatrix[i][i] * 5 + Math.random() * 200);
    }

    return {
      trainingHistory: history,
      confusionMatrix,
      learningCurves: {
        epochs: history.map(h => h.epoch),
        trainLoss: history.map(h => h.loss),
        valLoss: history.map(h => h.valLoss),
        trainAcc: history.map(h => h.accuracy),
        valAcc: history.map(h => h.valAccuracy)
      }
    };
  }
}

export const aiTrainingService = new AITrainingService();