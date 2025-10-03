import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import { OTPService } from '../../services/otp/otpService';
import { Shield, RefreshCw, Check, X } from 'lucide-react';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  fieldName?: string;
  onVerified: () => void;
}

export default function OTPVerificationModal({
  isOpen,
  onClose,
  phoneNumber,
  fieldName = 'unknown',
  onVerified,
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const [otpSent, setOtpSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (isOpen && !otpSent) {
      sendOTP();
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown > 0 && otpSent) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, otpSent]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        onVerified();
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const sendOTP = async () => {
    setLoading(true);
    setError('');
    setCanResend(false);

    try {
      const code = OTPService.generateOTP();
      setGeneratedCode(code);
      setOtpSent(true);
      setCountdown(600);

      console.log('📱 رمز التحقق (للاختبار فقط):', code);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('الرجاء إدخال رمز مكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (otp === generatedCode) {
        setSuccess(true);
      } else {
        setError('رمز التحقق غير صحيح');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtp('');
    setError('');
    setOtpSent(false);
    sendOTP();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="تم التحقق بنجاح">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">تم التحقق بنجاح!</h3>
          <p className="text-gray-600">تم تأكيد رقم الهاتف بنجاح</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تحقق من رقم الهاتف">
      <div className="space-y-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-700 mb-2">
            تم إرسال رمز التحقق إلى الرقم:
          </p>
          <p className="text-lg font-semibold text-gray-900 mb-4">
            {phoneNumber}
          </p>
          <p className="text-sm text-gray-500">
            يرجى إدخال الرمز المكون من 6 أرقام
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && generatedCode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-xs text-yellow-800 mb-1">وضع التطوير - رمز التحقق:</p>
            <p className="text-2xl font-mono font-bold text-yellow-900 text-center tracking-widest">
              {generatedCode}
            </p>
          </div>
        )}

        <div>
          <Input
            label="رمز التحقق"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            disabled={loading}
            className="text-center text-2xl tracking-widest font-mono"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
            <X className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            الوقت المتبقي: <span className="font-semibold">{formatTime(countdown)}</span>
          </span>
          {canResend && (
            <button
              onClick={handleResend}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              إعادة الإرسال
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={verifyOTP}
            disabled={loading || otp.length !== 6}
            className="flex-1"
            variant="primary"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <RefreshCw className="w-4 h-4 animate-spin ml-2" />
                جاري التحقق...
              </span>
            ) : (
              'تحقق'
            )}
          </Button>

          <Button onClick={onClose} variant="outline" disabled={loading}>
            إلغاء
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800 text-center">
            رمز التحقق صالح لمدة 10 دقائق فقط
          </p>
        </div>
      </div>
    </Modal>
  );
}
