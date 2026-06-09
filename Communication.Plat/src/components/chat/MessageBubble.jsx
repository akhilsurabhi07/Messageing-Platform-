import React from 'react';

export default function MessageBubble({ message, isOwnMessage }) {
  return (
    <div style={{
      ...styles.container,
      alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        ...styles.bubble,
        backgroundColor: isOwnMessage ? 'var(--accent-color)' : '#2a2a2a',
        color: isOwnMessage ? '#000' : '#fff',
        borderBottomRightRadius: isOwnMessage ? '4px' : '12px',
        borderBottomLeftRadius: !isOwnMessage ? '4px' : '12px',
      }}>
        <span style={styles.text}>{message.text}</span>
        <span style={{
          ...styles.time,
          color: isOwnMessage ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)'
        }}>
          {message.time}
        </span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '75%',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '2px'
  },
  bubble: {
    padding: '8px 12px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
  },
  text: {
    fontSize: '15px',
    lineHeight: '1.4',
    wordWrap: 'break-word'
  },
  time: {
    fontSize: '11px',
    alignSelf: 'flex-end',
    marginTop: '-4px'
  }
};
