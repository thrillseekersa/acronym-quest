/**
 * Avatar component that renders either a photo (URL/data:) or an emoji.
 * Props:
 *   avatar - string (emoji or URL)
 *   size - number in px (default 32)
 *   className - extra class names
 */
export default function Avatar({ avatar, size = 32, className = '' }) {
  const isImage = avatar && (avatar.startsWith('http') || avatar.startsWith('data:'));

  if (isImage) {
    return (
      <img
        src={avatar}
        alt="avatar"
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border: '2px solid rgba(255,255,255,0.7)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
        }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{ fontSize: size * 0.75, lineHeight: 1, flexShrink: 0 }}
    >
      {avatar || '👤'}
    </span>
  );
}
