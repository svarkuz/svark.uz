import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Download, Trash2, Move, Maximize2, RotateCw, X } from 'lucide-react';
import { toast } from 'sonner';

interface VirtualTryOnProps {
  initialProductImage?: string;
  onClose: () => void;
  onSave?: (resultImage: string) => void;
}

const ProductImage = ({ url, isSelected, onSelect, onChange }: any) => {
  const [image] = useImage(url, 'anonymous');
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <KonvaImage
        image={image}
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        draggable
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ initialProductImage, onClose, onSave }) => {
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState<string | null>(initialProductImage || null);
  const [bgImage] = useImage(bgImageUrl || '', 'anonymous');
  const [productProps, setProductProps] = useState({
    x: 50,
    y: 50,
    width: 200,
    height: 150,
    rotation: 0,
  });
  const [selected, setSelected] = useState(false);
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBgImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    if (!stageRef.current) return;
    const dataURL = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'virtual-try-on.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Rasm yuklab olindi");
  };

  const handleSave = () => {
    if (!stageRef.current) return;
    const dataURL = stageRef.current.toDataURL();
    onSave?.(dataURL);
    toast.success("Rasm saqlandi");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl bg-white rounded-3xl overflow-hidden flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Virtual Ko'rib Chiqish</h2>
            <p className="text-sm text-gray-500">Uyingizga darvoza yoki reshotkani moslab ko'ring</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Main Area */}
        <div className="flex-1 relative bg-gray-100 overflow-hidden flex items-center justify-center p-4">
          {!bgImageUrl ? (
            <div className="text-center space-y-6 max-w-md">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-12 h-12 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Uyingiz rasmini yuklang</h3>
                <p className="text-gray-500">Kameradan foydalanib rasmga oling yoki galereyadan tanlang</p>
              </div>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-2xl text-lg font-bold"
              >
                Rasm tanlash
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleBgUpload} 
              />
            </div>
          ) : (
            <div className="relative border-4 border-white shadow-2xl rounded-xl overflow-hidden bg-white">
              <Stage
                width={window.innerWidth > 1024 ? 800 : window.innerWidth - 64}
                height={window.innerHeight > 800 ? 500 : 400}
                ref={stageRef}
                onMouseDown={(e) => {
                  const clickedOnEmpty = e.target === e.target.getStage();
                  if (clickedOnEmpty) setSelected(false);
                }}
              >
                <Layer>
                  {bgImage && (
                    <KonvaImage
                      image={bgImage}
                      width={stageRef.current?.width()}
                      height={stageRef.current?.height()}
                    />
                  )}
                  {productUrl && (
                    <ProductImage
                      url={productUrl}
                      isSelected={selected}
                      onSelect={() => setSelected(true)}
                      onChange={(newAttrs: any) => {
                        setProductProps({ ...productProps, ...newAttrs });
                      }}
                      {...productProps}
                    />
                  )}
                </Layer>
              </Stage>
            </div>
          )}
        </div>

        {/* Controls */}
        {bgImageUrl && (
          <div className="p-6 border-t bg-white flex flex-wrap items-center justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setBgImageUrl(null)}
              className="rounded-xl border-gray-200"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Rasmni almashtirish
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl text-xs text-gray-500">
              <Move className="w-4 h-4" />
              Suring
              <span className="mx-2">|</span>
              <Maximize2 className="w-4 h-4" />
              Kattalashtiring
              <span className="mx-2">|</span>
              <RotateCw className="w-4 h-4" />
              Aylantiring
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleDownload}
                className="rounded-xl border-gray-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Yuklab olish
              </Button>
              <Button 
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8"
              >
                Saqlash
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
