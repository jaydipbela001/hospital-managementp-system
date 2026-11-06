import React from 'react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // danger | primary
  loading = false,
}) {
  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={loading}>
        {cancelText}
      </Button>
      <Button variant={variant} onClick={onConfirm} loading={loading}>
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer} maxWidth="420px">
      <p style={{ color: 'var(--color-text)', lineHeight: 1.5 }}>{message}</p>
    </Modal>
  );
}

export default ConfirmDialog;

