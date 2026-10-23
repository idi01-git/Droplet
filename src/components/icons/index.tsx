import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  accentColor?: string;
  className?: string;
  strokeWidth?: number;
}

const defaultProps = {
  size: 24,
  color: '#000000',
  accentColor: '#FFE000',
  strokeWidth: 2.5,
};

// 1. Upload Icon (Row 1, Col 1)
export const UploadIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Arrow Shaft & Head */}
    <path
      d="M12 15V4M12 4L7 9M12 4L17 9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Bottom Tray */}
    <path
      d="M4 14V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V14"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 2. Download Icon (Row 1, Col 2 - Down arrow entering yellow tray)
export const DownloadIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Bottom Tray with yellow fill */}
    <path
      d="M4.5 13.5V18C4.5 19.1 5.4 20 6.5 20H17.5C18.6 20 19.5 19.1 19.5 18V13.5"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Arrow Shaft & Head entering tray */}
    <path
      d="M12 3V14M12 14L8 10M12 14L16 10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 3. Copy Icon (Row 1, Col 3 - Yellow back tile)
export const CopyIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Back tile with yellow fill */}
    <rect
      x="4"
      y="8"
      width="12"
      height="12"
      rx="2"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    {/* Front tile */}
    <rect
      x="8"
      y="4"
      width="12"
      height="12"
      rx="2"
      fill="#FFFFFF"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
);

// 4. Trash Icon (Row 1, Col 4)
export const TrashIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Lid handle */}
    <path
      d="M9 6V4.5C9 3.67157 9.67157 3 10.5 3H13.5C14.3284 3 15 3.67157 15 4.5V6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    {/* Horizontal lid bar */}
    <path
      d="M3 6H21"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    {/* Can body */}
    <path
      d="M5.5 6L6.5 19.5C6.6 20.3 7.3 21 8.1 21H15.9C16.7 21 17.4 20.3 17.5 19.5L18.5 6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Ribs */}
    <path
      d="M10 10V16M14 10V16"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

// 5. Link Icon (Row 2, Col 1)
export const LinkIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 6. File Document Icon (Row 2, Col 2)
export const FileIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Document with folded ear */}
    <path
      d="M6 3H14L19 8V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V4C5 3.44772 5.44772 3 6 3Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#FFFFFF"
    />
    <path
      d="M14 3V8H19"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Text lines */}
    <path
      d="M9 13H15M9 17H13"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

// 7. Image Icon (Row 2, Col 3 - Yellow mountain highlight & sun)
export const ImageIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Frame */}
    <rect
      x="3.5"
      y="3.5"
      width="17"
      height="17"
      rx="3"
      stroke={color}
      strokeWidth={strokeWidth}
      fill="#FFFFFF"
    />
    {/* Mountain with yellow fill */}
    <path
      d="M4 17L8.5 12.5L12 16L15.5 12.5L20 17V18C20 18.8 19.3 19.5 18.5 19.5H5.5C4.7 19.5 4 18.8 4 18V17Z"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    {/* Sun */}
    <circle cx="16.5" cy="8.5" r="1.5" fill={color} />
  </svg>
);

// 8. Code Icon (Row 2, Col 4)
export const CodeIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M7 8L3 12L7 16M17 8L21 12L17 16M14 4L10 20"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 9. Folder Icon (Row 3, Col 1 - Yellow filled body)
export const FolderIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Folder Tab & Body */}
    <path
      d="M3 6C3 4.89543 3.89543 4 5 4H9.5C10.3 4 11 4.5 11.4 5.2L12.5 7H19C20.1046 7 21 7.89543 21 9V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M3 10H21"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

// 10. Chat Message Bubble (Row 3, Col 2)
export const ChatIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M4 5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V14C20 15.1046 19.1046 16 18 16H8L4 20V5Z"
      fill="#FFFFFF"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Three dots / dashes */}
    <path
      d="M8 9.5H8.01M12 9.5H12.01M16 9.5H16.01"
      stroke={color}
      strokeWidth={strokeWidth + 0.5}
      strokeLinecap="round"
    />
  </svg>
);

// 11. Settings / Gear Icon (Row 3, Col 3 - Yellow core)
export const SettingsIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Outer cog */}
    <path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 12. Clock Icon (Row 3, Col 4)
export const ClockIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke={color}
      strokeWidth={strokeWidth}
      fill={accentColor}
    />
    <path
      d="M12 7.5V12H15.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="1.5" fill={color} />
  </svg>
);

// 13. Wifi / Sync Icon (Row 4, Col 1)
export const WifiIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M3 8.5C5.5 6 8.6 4.5 12 4.5C15.4 4.5 18.5 6 21 8.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <path
      d="M6.5 12C8 10.5 9.9 9.5 12 9.5C14.1 9.5 16 10.5 17.5 12"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <path
      d="M10 15.5C10.5 15 11.2 14.7 12 14.7C12.8 14.7 13.5 15 14 15.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <circle cx="12" cy="19.5" r="1.5" fill={color} />
  </svg>
);

// 14. Check Circle Icon (Row 4, Col 2 - Yellow filled circle with black check)
export const CheckCircleIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle
      cx="12"
      cy="12"
      r="9.5"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M8 12.5L10.5 15L16 9.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 15. Cross Circle Icon (Row 4, Col 3 - Yellow filled circle with black X)
export const CrossCircleIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle
      cx="12"
      cy="12"
      r="9.5"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M9 9L15 15M15 9L9 15"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

// 16. Info Icon (Row 4, Col 4)
export const InfoIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle
      cx="12"
      cy="12"
      r="9.5"
      stroke={color}
      strokeWidth={strokeWidth}
      fill="#FFFFFF"
    />
    <circle cx="12" cy="8" r="1.25" fill={color} />
    <path
      d="M12 11V16M10.5 11H12"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

// 17. Close / Cross Icon (Single X without circle)
export const CloseIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 18. Plain Checkmark Icon
export const CheckIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M5 12.5L9.5 17L19 7"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 19. QR Code Icon
export const QrCodeIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} fill="#FFFFFF" />
    <rect x="5.5" y="5.5" width="2" height="2" fill={accentColor} />
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} fill="#FFFFFF" />
    <rect x="16.5" y="5.5" width="2" height="2" fill={color} />
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} fill="#FFFFFF" />
    <rect x="5.5" y="16.5" width="2" height="2" fill={color} />
    <path d="M14 14H15V17H14V14ZM18 14H21V16H18V14ZM14 19H17V21H14V19ZM19 18H21V21H19V18Z" fill={color} />
  </svg>
);

// 20. Home Icon (With yellow door)
export const HomeIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M3 10L12 3L21 10V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      fill="#FFFFFF"
    />
    <rect
      x="9.5"
      y="13"
      width="5"
      height="8"
      rx="1"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </svg>
);

// 21. Share Icon (With yellow central hub)
export const ShareIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <circle cx="18" cy="5" r="3" fill="#FFFFFF" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="6" cy="12" r="3.5" fill={accentColor} stroke={color} strokeWidth={strokeWidth} />
    <circle cx="18" cy="19" r="3" fill="#FFFFFF" stroke={color} strokeWidth={strokeWidth} />
  </svg>
);

// 22. Shield Icon (With yellow field)
export const ShieldIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M12 2.8C8.5 2.8 5 4.2 5 4.2V11.5C5 16.6 8.2 20.8 12 22C15.8 20.8 19 16.6 19 11.5V4.2C19 4.2 15.5 2.8 12 2.8Z"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M8.5 12.2L11 14.7L15.5 9.8"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 23. Sparkles Icon
export const SparklesIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M12 3C12 7.5 15.5 11 20 11C15.5 11 12 14.5 12 19C12 14.5 8.5 11 4 11C8.5 11 12 7.5 12 3Z"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M19 16C19 17.5 20 18.5 21.5 18.5C20 18.5 19 19.5 19 21C19 19.5 18 18.5 16.5 18.5C18 18.5 19 17.5 19 16Z"
      fill={color}
    />
  </svg>
);

// 24. Arrow Right & Left Icons
export const ArrowRightIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M5 12H19M19 12L13 6M19 12L13 18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M19 12H5M5 12L11 6M5 12L11 18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 25. Send Icon (Paper plane with yellow fold)
export const SendIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M22 2L11 13"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 2L15 22L11 13L2 9L22 2Z"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
);

// 26. Eraser Icon
export const EraserIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M19.7 6.3L17.7 4.3C16.9 3.5 15.6 3.5 14.8 4.3L3.3 15.8C2.5 16.6 2.5 17.9 3.3 18.7L5.3 20.7C6.1 21.5 7.4 21.5 8.2 20.7L19.7 9.2C20.5 8.4 20.5 7.1 19.7 6.3Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      fill="#FFFFFF"
    />
    <path
      d="M8.5 8.5L15.5 15.5"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M3.3 15.8L8.2 20.7H13"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M18 21H22"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

// 27. Archive / Zip Icon (Box with yellow flap)
export const ArchiveIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="5"
      rx="1.5"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M4 9V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V9"
      stroke={color}
      strokeWidth={strokeWidth}
      fill="#FFFFFF"
    />
    <path
      d="M10 13H14"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

// 28. External Link Icon
export const ExternalLinkIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M18 13V19C18 19.5523 17.5523 20 17 20H5C4.44772 20 4 19.5523 4 19V7C4 6.44772 4.44772 6 5 6H11"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 4H20V9M20 4L10 14"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// 29. Zap / Flash Icon
export const ZapIcon: React.FC<IconProps> = ({
  size = defaultProps.size,
  color = defaultProps.color,
  accentColor = defaultProps.accentColor,
  strokeWidth = defaultProps.strokeWidth,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M13 2.5L4.5 13H11.5L9.5 21.5L19.5 10.5H12.5L13 2.5Z"
      fill={accentColor}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
