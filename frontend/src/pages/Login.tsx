import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ToastBridge } from '../components/Toast';

type AuthMode = 'login' | 'register' | 'forgot' | 'check-email';

export function Login() {
  const { signIn, signUp, resetPassword, isLoading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkEmailMessage, setCheckEmailMessage] = useState('');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const clearError = () => setError(null);
  const switchMode = (m: AuthMode) => { setMode(m); clearError(); };

  // ─── Đăng nhập ─────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  // ─── Đăng ký ───────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp(email, password, fullName);
    if (error) {
      setError(error);
    } else if (needsConfirmation) {
      setCheckEmailMessage(`Chúng tôi đã gửi email xác thực đến ${email}. Vui lòng kiểm tra hộp thư và bấm vào link để kích hoạt tài khoản.`);
      setMode('check-email');
    }
    setLoading(false);
  };

  // ─── Quên mật khẩu ─────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error);
    } else {
      setCheckEmailMessage(`Chúng tôi đã gửi link đặt lại mật khẩu đến ${email}. Vui lòng kiểm tra hộp thư (bao gồm thư mục spam).`);
      setMode('check-email');
    }
    setLoading(false);
  };

  // ─── Shared UI ─────────────────────────────────────────────────────────────
  const inputClass =
    'appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-white';
  const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';
  const btnPrimary =
    'w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm shadow-blue-500/30 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

  const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
      <h2 className="text-center text-3xl font-extrabold text-[#0A1629] tracking-tight">{title}</h2>
      <p className="mt-2 text-center text-sm text-slate-500 font-medium px-4">{subtitle}</p>
    </div>
  );

  const ErrorAlert = () => (
    <ToastBridge message={error} variant="error" onDone={() => setError(null)} />
  );

  // ─── Kiểm tra email ─────────────────────────────────────────────────────────
  if (mode === 'check-email') {
    return (
      <PageWrapper>
        <Header title="Kiểm tra email" subtitle="" />
        <Card>
          <div className="flex flex-col items-center text-center py-2">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Đã gửi!</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{checkEmailMessage}</p>
            <button
              className="mt-6 text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              onClick={() => switchMode('login')}
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
            </button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  // ─── Quên mật khẩu ─────────────────────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <PageWrapper>
        <Header title="Quên mật khẩu?" subtitle="Nhập email tài khoản, chúng tôi sẽ gửi link đặt lại mật khẩu." />
        <Card>
          <form className="space-y-5" onSubmit={handleForgotPassword}>
            <ErrorAlert />
            <div>
              <label htmlFor="forgot-email" className={labelClass}>Email</label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="email@example.com"
              />
            </div>
            <button type="submit" className={btnPrimary} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Gửi link đặt lại mật khẩu
            </button>
          </form>
          <div className="mt-6 flex justify-center">
            <button onClick={() => switchMode('login')} className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại đăng nhập
            </button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  // ─── Đăng ký ───────────────────────────────────────────────────────────────
  if (mode === 'register') {
    return (
      <PageWrapper>
        <Header title="Tạo tài khoản" subtitle="Đăng ký để sử dụng hệ thống quản lý Đức Huyền" />
        <Card>
          <form className="space-y-5" onSubmit={handleRegister}>
            <ErrorAlert />
            <div>
              <label htmlFor="full-name" className={labelClass}>Họ và tên</label>
              <input
                id="full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label htmlFor="reg-email" className={labelClass}>Email</label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className={labelClass}>Mật khẩu</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass + ' pr-11'}
                  placeholder="Ít nhất 6 ký tự"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className={labelClass}>Xác nhận mật khẩu</label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass + ' pr-11'}
                  placeholder="Nhập lại mật khẩu"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" className={btnPrimary} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Tạo tài khoản
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Đã có tài khoản?{' '}
            <button onClick={() => switchMode('login')} className="font-semibold text-blue-600 hover:text-blue-700">
              Đăng nhập
            </button>
          </p>
        </Card>
      </PageWrapper>
    );
  }

  // ─── Đăng nhập (default) ────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <Header title="ĐỨC HUYỀN" subtitle="Đăng nhập vào hệ thống quản lý" />
      <Card>
        <form className="space-y-5" onSubmit={handleLogin}>
          <ErrorAlert />
          <div>
            <label htmlFor="email" className={labelClass}>Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="email@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>Mật khẩu</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass + ' pr-11'}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button type="button" onClick={() => switchMode('forgot')} className="text-sm font-semibold text-blue-600 hover:text-blue-500">
              Quên mật khẩu?
            </button>
          </div>
          <button type="submit" className={btnPrimary} disabled={loading || authLoading}>
            {(loading || authLoading) && <Loader2 className="w-4 h-4 animate-spin" />}
            Đăng nhập
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Chưa có tài khoản?{' '}
          <button onClick={() => switchMode('register')} className="font-semibold text-blue-600 hover:text-blue-700">
            Đăng ký ngay
          </button>
        </p>
      </Card>
    </PageWrapper>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
        {children}
      </div>
    </div>
  );
}
