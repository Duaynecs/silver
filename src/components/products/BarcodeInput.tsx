import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProductsStore } from '@/stores/productsStore';
import { generateEAN13FromSequence, validateEAN } from '@/utils/barcode';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BarcodeInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export default function BarcodeInput({
  value,
  onChange,
  placeholder,
  error,
}: BarcodeInputProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isScanning, setIsScanning] = useState(false);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    type: 'EAN-13' | 'EAN-8' | 'INVALID' | 'EMPTY';
    message: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const getNextSequentialBarcode = useProductsStore(
    (state) => state.getNextSequentialBarcode
  );

  useEffect(() => {
    setInputValue(value || '');
    if (value) {
      setValidation(validateEAN(value));
    } else {
      setValidation(null);
    }
  }, [value]);

  useEffect(() => {
    // Detecta leitura de código de barras (múltiplos caracteres em sequência rápida)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isScanning) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;

      // Se a diferença de tempo for muito grande, limpa o buffer
      if (timeDiff > 100) {
        scanBufferRef.current = '';
      }

      lastKeyTimeRef.current = currentTime;

      // Se for Enter, processa o código
      if (e.key === 'Enter' && scanBufferRef.current.length > 0) {
        e.preventDefault();
        const scannedCode = scanBufferRef.current;
        setInputValue(scannedCode);
        onChange(scannedCode);
        setValidation(validateEAN(scannedCode));
        scanBufferRef.current = '';
        setIsScanning(false);
        return;
      }

      // Acumula caracteres alfanuméricos
      if (e.key.length === 1) {
        scanBufferRef.current += e.key;
      }
    };

    if (isScanning) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isScanning, onChange]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove caracteres não numéricos
    const newValue = e.target.value.replace(/\D/g, '');

    // Limita a 13 dígitos (EAN-13 é o máximo)
    const limitedValue = newValue.slice(0, 13);

    setInputValue(limitedValue);
    onChange(limitedValue);

    // Valida em tempo real
    if (limitedValue.trim() === '') {
      setValidation(null);
    } else {
      setValidation(validateEAN(limitedValue));
    }
  };

  const handleGenerateEAN = async () => {
    setIsGenerating(true);
    try {
      // Busca o próximo número sequencial do banco
      const nextSequence = await getNextSequentialBarcode();

      // Gera o EAN-13 a partir da sequência
      const generatedEAN = generateEAN13FromSequence(nextSequence);

      setInputValue(generatedEAN);
      onChange(generatedEAN);
      setValidation(validateEAN(generatedEAN));
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error generating EAN:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const showValidation = validation && inputValue.trim() !== '';
  const isValidState = showValidation && validation.isValid;
  const isInvalidState = showValidation && !validation.isValid;

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={handleManualChange}
            placeholder={placeholder || 'Digite ou escaneie o código de barras'}
            className={
              isScanning
                ? 'ring-2 ring-primary'
                : isInvalidState
                ? 'ring-2 ring-destructive border-destructive'
                : isValidState
                ? 'ring-2 ring-green-500 border-green-500'
                : ''
            }
            disabled={isScanning}
            maxLength={13}
          />
          {showValidation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidState ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : isInvalidState ? (
                <XCircle className="w-4 h-4 text-destructive" />
              ) : null}
            </div>
          )}
        </div>
        {/* <Button
          type="button"
          variant={isScanning ? 'default' : 'outline'}
          onClick={handleStartScan}
          disabled={isScanning}
          title="Iniciar leitura de código de barras"
        >
          <Barcode className="w-4 h-4" />
          {isScanning ? 'Escaneando...' : ''}
        </Button> */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGenerateEAN}
          disabled={isScanning || isGenerating}
          title="Gerar próximo EAN-13 sequencial do banco"
        >
          <RefreshCw
            className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {showValidation && !error && validation.message && (
        <p
          className={`text-xs ${
            isValidState ? 'text-green-600' : 'text-destructive'
          }`}
        >
          {validation.message}
        </p>
      )}
    </div>
  );
}
