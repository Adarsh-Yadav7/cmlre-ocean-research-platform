import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Camera, Zap, CheckCircle, AlertCircle } from "lucide-react";

interface IdentificationResult {
  species: {
    scientificName: string;
    commonName: string;
    family: string;
    habitat: string;
    conservationStatus: string;
    depth: string;
    confidence: number;
  };
  analysis: {
    processingTime: number;
    modelUsed: string;
    features: string[];
  };
}

interface SpeciesIdentificationProps {
  onIdentify?: (formData: FormData) => void;
}

export function SpeciesIdentification({ onIdentify }: SpeciesIdentificationProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const demoImages = [
    {
      id: 'fish1',
      src: 'https://images.unsplash.com/photo-1591025207163-942350e47db2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150',
      alt: 'Tropical fish underwater',
      species: 'Blue Tang'
    },
    {
      id: 'coral1', 
      src: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150',
      alt: 'Coral reef ecosystem',
      species: 'Brain Coral'
    },
    {
      id: 'turtle1',
      src: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150',
      alt: 'Sea turtle underwater',
      species: 'Green Sea Turtle'
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        processImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDemoClick = (imageUrl: string, speciesType: string) => {
    setSelectedImage(imageUrl);
    processDemoImage(speciesType);
  };

  const processImage = async (file: File) => {
    if (!onIdentify) {
      processDemoImage('fish1');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      onIdentify(formData);
      // Simulate processing time
      setTimeout(() => {
        setIsProcessing(false);
        setResult(generateMockResult('uploaded'));
      }, 3000);
    } catch (error) {
      setIsProcessing(false);
      console.error('Error processing image:', error);
    }
  };

  const processDemoImage = (speciesType: string) => {
    setIsProcessing(true);
    setResult(null);

    // Simulate AI processing
    setTimeout(() => {
      setIsProcessing(false);
      setResult(generateMockResult(speciesType));
    }, 2000);
  };

  const generateMockResult = (type: string): IdentificationResult => {
    const results = {
      fish1: {
        species: {
          scientificName: "Paracanthurus hepatus",
          commonName: "Blue Tang",
          family: "Acanthuridae",
          habitat: "Coral reefs",
          conservationStatus: "Least Concern",
          depth: "2-40m",
          confidence: 94.7
        },
        analysis: {
          processingTime: 23,
          modelUsed: "ResNet-50 CNN",
          features: ["Blue coloration", "Tang body shape", "Distinctive markings", "Reef habitat"]
        }
      },
      coral1: {
        species: {
          scientificName: "Diploria labyrinthiformis",
          commonName: "Grooved Brain Coral",
          family: "Mussidae",
          habitat: "Tropical reefs",
          conservationStatus: "Near Threatened",
          depth: "1-20m",
          confidence: 91.3
        },
        analysis: {
          processingTime: 31,
          modelUsed: "ResNet-50 CNN",
          features: ["Brain-like ridges", "Calcium carbonate structure", "Colonial formation", "Shallow water"]
        }
      },
      turtle1: {
        species: {
          scientificName: "Chelonia mydas",
          commonName: "Green Sea Turtle",
          family: "Cheloniidae",
          habitat: "Coastal waters",
          conservationStatus: "Endangered",
          depth: "0-50m",
          confidence: 96.8
        },
        analysis: {
          processingTime: 18,
          modelUsed: "ResNet-50 CNN",
          features: ["Streamlined shell", "Flippers", "Sea turtle morphology", "Marine habitat"]
        }
      }
    };

    return results[type as keyof typeof results] || results.fish1;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "Least Concern": "text-green-600",
      "Near Threatened": "text-yellow-600", 
      "Vulnerable": "text-orange-600",
      "Endangered": "text-red-600"
    };
    return colors[status as keyof typeof colors] || "text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover-elevate">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileUpload}
          data-testid="input-species-upload"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="mb-4"
          disabled={isProcessing}
          data-testid="button-upload-image"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Marine Life Image
        </Button>
        <div className="text-muted-foreground text-sm">
          Drag & drop or click to select (Max 10MB)
        </div>
      </div>

      {/* Demo Images */}
      <div>
        <div className="text-sm text-muted-foreground mb-3">Or try with sample images:</div>
        <div className="grid grid-cols-3 gap-3">
          {demoImages.map((image) => (
            <div key={image.id} className="relative group cursor-pointer" data-testid={`demo-image-${image.id}`}>
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-20 object-cover rounded-lg hover:opacity-80 transition-opacity"
                onClick={() => handleDemoClick(image.src, image.id)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors" />
              <div className="absolute bottom-1 left-1 right-1">
                <Badge variant="secondary" className="text-xs">
                  {image.species}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Image */}
      {selectedImage && (
        <Card>
          <CardContent className="p-4">
            <img 
              src={selectedImage} 
              alt="Selected species for identification" 
              className="w-full h-48 object-cover rounded-lg mb-4"
              data-testid="selected-image"
            />
          </CardContent>
        </Card>
      )}

      {/* Processing State */}
      {isProcessing && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-blue-600 animate-pulse" />
              <span className="text-blue-800 font-medium">AI Analysis in Progress...</span>
            </div>
            <Progress value={undefined} className="h-2 mb-2" />
            <div className="text-xs text-blue-600">
              Processing image • Extracting features • Comparing with database
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !isProcessing && (
        <Card className="bg-green-50 border-green-200" data-testid="identification-result">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">Species Identified</span>
              <Badge className="ml-auto bg-green-100 text-green-800">
                {result.species.confidence}% confidence
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-foreground" data-testid="species-scientific-name">
                  {result.species.scientificName}
                </h3>
                <p className="text-muted-foreground" data-testid="species-common-name">
                  {result.species.commonName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Family:</span>
                  <div className="font-medium" data-testid="species-family">{result.species.family}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Habitat:</span>
                  <div className="font-medium" data-testid="species-habitat">{result.species.habitat}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Conservation Status:</span>
                  <div className={`font-medium ${getStatusColor(result.species.conservationStatus)}`} data-testid="species-status">
                    {result.species.conservationStatus}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Typical Depth:</span>
                  <div className="font-medium" data-testid="species-depth">{result.species.depth}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-green-200">
                <h4 className="font-medium text-sm mb-2">Analysis Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Processing Time:</span>
                    <div className="font-medium">{result.analysis.processingTime}ms</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Model Used:</span>
                    <div className="font-medium">{result.analysis.modelUsed}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-muted-foreground text-xs">Key Features:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.analysis.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Camera className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <div className="font-medium mb-1">Best Results Tips:</div>
              <ul className="space-y-1 text-xs">
                <li>• Use clear, well-lit images</li>
                <li>• Ensure the subject fills most of the frame</li>
                <li>• Avoid blurry or heavily edited photos</li>
                <li>• Natural underwater lighting preferred</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
