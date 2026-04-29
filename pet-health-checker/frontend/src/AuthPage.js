import React, { useState } from "react";
import { signup, login } from "./api";

export default function AuthPage({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isSignup) {
        await signup(email, password);
        setIsSignup(false);
        setError("회원가입 완료! 로그인해주세요.");
      } else {
        const data = await login(email, password);
        localStorage.setItem("token", data.token);
        onLogin();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h1>🐾 펫 건강 체커</h1>
      <p className="subtitle">AI 기반 반려동물 건강 상담 서비스</p>
      <form onSubmit={handleSubmit} className="auth-form">
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">{isSignup ? "회원가입" : "로그인"}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button className="link-btn" onClick={() => { setIsSignup(!isSignup); setError(""); }}>
        {isSignup ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
      </button>
    </div>
  );
}
