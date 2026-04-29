import React from "react";

export default function HospitalSection({ userLocation, urgencyScore, onShowCard }) {
  const naverMapUrl = userLocation
    ? `https://map.naver.com/v5/search/동물병원?c=${userLocation.lng},${userLocation.lat},15,0,0,0,dh`
    : null;

  const kakaoMapUrl = "https://map.kakao.com/?q=동물병원";

  return (
    <div className="hospital-section">
      <div className="emergency-banner">
        🚨 지금 즉시 동물병원으로 이동하세요
      </div>

      <div className="hospital-checklist">
        <h4>병원 방문 전 준비하세요</h4>
        <ul>
          <li>반려동물을 이동장이나 담요로 안전하게 감싸주세요</li>
          <li>최근 먹은 음식이나 이물질이 있다면 기억해 두세요</li>
          <li>구토물·변이 있으면 사진으로 찍어 보관하세요</li>
          <li>증상이 언제부터 시작됐는지 메모해 두세요</li>
        </ul>
      </div>

      <div className="map-buttons">
        {naverMapUrl ? (
          <a href={naverMapUrl} target="_blank" rel="noopener noreferrer" className="hospital-btn">
            📍 네이버 지도에서 주변 동물병원 찾기
          </a>
        ) : (
          <>
            <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer" className="kakao-btn">
              🗺️ 카카오맵에서 주변 동물병원 찾기
            </a>
            <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: 4 }}>
              위치 권한을 허용하면 네이버 지도로 더 정확히 찾을 수 있어요
            </p>
          </>
        )}

        <button className="show-card-btn" onClick={onShowCard}>
          📋 의사에게 보여주기 (증상 요약 카드)
        </button>
      </div>
    </div>
  );
}
