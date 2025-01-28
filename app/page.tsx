'use client';
import React, { useState, useRef, useEffect } from 'react';

const EXPO_ICON_SIZES = {
  'adaptive-icon.png': { width: 1024, height: 1024 },
  'favicon.png': { width: 48, height: 48 },
  'icon.png': { width: 1024, height: 1024 },
  'splash.png': { width: 1024, height: 1024 },
};

const DarkThemeImage = ({
  imageUrl,
  alt = "icon",
  size = 64,
  darkMode = {
    brightness: 0.8,
    contrast: 1.2,
    invert: 1,
  },
  onImageLoad
}) => {
  const getFilterStyle = (settings) => {
    const { brightness, contrast, invert } = settings;
    return `brightness(${brightness}) contrast(${contrast}) invert(${invert})`;
  };

  return (
    <img
      src={imageUrl || "/api/placeholder/64/64"}
      alt={alt}
      style={{
        width: size,
        height: size,
        transition: 'filter 0.3s ease',
        filter: getFilterStyle(darkMode)
      }}
      className="object-contain"
      onLoad={onImageLoad}
    />
  );
};

const ImageIconDemo = () => {
  const [isDark, setIsDark] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [settings, setSettings] = useState({
    brightness: 0.8,
    contrast: 1.2,
    invert: 1,
  });
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState("");
  const canvasRef = useRef(null);
  const darkImageRef = useRef(null);
  
  // 处理图片加载完成
  const handleImageLoad = (e) => {
    const img = e.target;
    setOriginalSize({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // 处理图片上传
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
        if (img.width < 1024 || img.height < 1024) {
          setError("请上传至少 1024x1024 像素的图片");
          setImageUrl("");
          return;
        }
        setError("");
        setOriginalSize({ width: img.width, height: img.height });
        setImageUrl(URL.createObjectURL(file));
      };
      img.src = URL.createObjectURL(file);
    }
  };

  // 创建指定尺寸的图片
  const createResizedImage = (sourceImage, targetWidth, targetHeight, darkMode = false) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (darkMode) {
        const { brightness, contrast, invert } = settings;
        ctx.filter = `brightness(${brightness}) contrast(${contrast}) invert(${invert})`;
      }

      // 保持宽高比的同时填充整个画布
      const sourceAspect = sourceImage.width / sourceImage.height;
      const targetAspect = targetWidth / targetHeight;
      let drawWidth, drawHeight, drawX, drawY;

      if (sourceAspect > targetAspect) {
        drawHeight = targetHeight;
        drawWidth = sourceImage.width * (targetHeight / sourceImage.height);
        drawX = (targetWidth - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = targetWidth;
        drawHeight = sourceImage.height * (targetWidth / sourceImage.width);
        drawX = 0;
        drawY = (targetHeight - drawHeight) / 2;
      }

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  // 导出单个处理后的图片
  const exportImage = async () => {
    if (!imageUrl || !darkImageRef.current) return;

    const img = new Image();
    img.src = imageUrl;
    await new Promise(resolve => { img.onload = resolve; });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = originalSize.width;
    canvas.height = originalSize.height;
    ctx.filter = darkImageRef.current.style.filter;
    ctx.drawImage(img, 0, 0, originalSize.width, originalSize.height);
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dark-icon.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // 导出 Expo 图标包
  const exportExpoIcons = async () => {
    if (!imageUrl) return;

    const img = new Image();
    img.src = imageUrl;
    await new Promise(resolve => { img.onload = resolve; });

    // 创建 ZIP 文件
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // 处理每个尺寸的图标
    for (const [filename, size] of Object.entries(EXPO_ICON_SIZES)) {
      // 创建普通版本
      const normalBlob = await createResizedImage(img, size.width, size.height, false);
      zip.file(filename, normalBlob);

      // 创建暗色版本
      const darkBlob = await createResizedImage(img, size.width, size.height, true);
      const darkFilename = filename.replace('.png', '-dark.png');
      zip.file(darkFilename, darkBlob);
    }

    // 下载 ZIP 文件
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expo-icons.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const presets = [
    { name: '经典反转', settings: { brightness: 0.8, contrast: 1.2, invert: 1 } },
    { name: '柔和暗色', settings: { brightness: 0.7, contrast: 1.1, invert: 0.8 } },
    { name: '高对比度', settings: { brightness: 0.9, contrast: 1.4, invert: 1 } },
  ];

  return (
    <div className={`p-8 ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg transition-colors duration-300`}>
      <div className="flex flex-col items-center gap-6">
        {/* 图片上传区域 */}
        <div className="w-full max-w-md">
          <label className="block text-sm font-medium mb-2">
            上传图标 (至少 1024x1024 像素)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* 主题切换 */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          {isDark ? '切换到亮色模式' : '切换到暗色模式'}
        </button>

        {/* 图标预览区域 */}
        <div className="grid grid-cols-2 gap-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm">原始图标</p>
            <DarkThemeImage 
              imageUrl={imageUrl}
              darkMode={{...settings, invert: 0}}
              onImageLoad={handleImageLoad}
            />
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm">暗色效果</p>
            <DarkThemeImage
              imageUrl={imageUrl}
              darkMode={settings}
              ref={darkImageRef}
            />
          </div>
        </div>

        {/* 导出按钮组 */}
        <div className="flex gap-4">
          <button
            onClick={exportImage}
            disabled={!imageUrl}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            导出单个图标
          </button>
          <button
            onClick={exportExpoIcons}
            disabled={!imageUrl || !!error}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            导出 Expo 图标包
          </button>
        </div>

        {/* 预设效果选择 */}
        <div className="flex gap-4 mt-6">
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => setSettings(preset.settings)}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors text-sm"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* 参数调节区域 */}
        <div className="w-full max-w-md space-y-4 mt-6">
          <div>
            <label className="block text-sm mb-1">亮度 ({settings.brightness})</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.brightness}
              onChange={(e) => setSettings({...settings, brightness: parseFloat(e.target.value)})}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">对比度 ({settings.contrast})</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.contrast}
              onChange={(e) => setSettings({...settings, contrast: parseFloat(e.target.value)})}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">反转 ({settings.invert})</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.invert}
              onChange={(e) => setSettings({...settings, invert: parseFloat(e.target.value)})}
              className="w-full"
            />
          </div>
        </div>

        {/* 隐藏的 canvas 用于导出图片 */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default ImageIconDemo;