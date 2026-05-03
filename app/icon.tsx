import { ImageResponse } from 'next/og'

// Image size + type
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E0E7FF',
          borderRadius: '8px',
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer image frame */}
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            stroke="#4F46E5"
            strokeWidth="1.5"
            opacity="0.4"
          />

          {/* Cropped area */}
          <rect
            x="7"
            y="7"
            width="10"
            height="10"
            rx="1"
            fill="#4F46E5"
            opacity="0.12"
            stroke="#4F46E5"
            strokeWidth="1.5"
          />

          {/* Crop corner handles */}
          <path d="M7 10V7H10" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M14 7H17V10" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M17 14V17H14" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M10 17H7V14" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round"/>

          {/* Center focus point (auto detection hint) */}
          <circle cx="12" cy="12" r="1.2" fill="#4F46E5" />
        </svg>
      </div>
    ),
    { ...size }
  )
}