import React, { useState } from 'react';

type NoticeLinkInputProps = {
  label: string;
  value: string;
  valid: boolean;
  onChange: (url: string, sharedText?: string) => void;
};

export function NoticeLinkInput({ label, value, valid, onChange }: NoticeLinkInputProps) {
  const [pasteError, setPasteError] = useState('');

  return (
    <label className="w-flow-field">
      <span>{label}</span>
      <input
        type="url"
        value={value}
        placeholder="https://"
        onChange={event => {
          setPasteError('');
          onChange(event.currentTarget.value);
        }}
        onPaste={event => {
          const text = event.clipboardData.getData('text/plain');
          if (!text) return;
          event.preventDefault();

          const candidates = text.match(/https?:\/\/[^\s<>"“”‘’]+/gi) ?? [];
          const links = [...new Set(candidates.map(link => link.replace(/[.,;!?。，、！？…\])}〉》」』]+$/u, '')))];
          if (links.length !== 1) {
            setPasteError(links.length
              ? '링크가 여러 개 있어요. 안내장 링크 하나만 복사해서 붙여넣어주세요.'
              : '공유 문구에서 링크를 찾지 못했어요. https:// 주소가 포함된 내용을 붙여넣어주세요.');
            return;
          }

          setPasteError('');
          onChange(links[0], text.slice(0, 20000));
        }}
      />
      {pasteError
        ? <small role="alert">{pasteError}</small>
        : value && !valid
          ? <small role="alert">올바른 http 또는 https 링크를 입력해주세요.</small>
          : null}
      <small>공유 문구를 통째로 붙여넣어도 링크를 찾아 읽어요. 읽어온 내용을 확인한 뒤 적용해주세요.</small>
    </label>
  );
}
