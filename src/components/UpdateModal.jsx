/**
 * @file UpdateModal.jsx
 * @author Lorenzo Lione <https://github.com/lorenz1974>
 * @description Modal to notify available PWA updates
 * @created March 2026
 * @license MIT
 */

import React from 'react'
import { Modal, Button } from 'react-bootstrap'

/**
 * UpdateModal - Modal showing update availability
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether the modal is visible
 * @param {string} props.currentVersion - Current installed version
 * @param {string} props.newVersion - New available version
 * @param {Function} props.onUpdate - Callback to confirm update
 * @param {Function} props.onLater - Callback to postpone update
 */
const UpdateModal = ({
  show,
  currentVersion,
  newVersion,
  onUpdate,
  onLater,
}) => {
  return (
    <Modal
      show={show}
      onHide={onLater}
      centered
      backdrop='static'
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>⬆️ Update Available</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>A new version of the application is available!</p>
        <div className='my-3 p-3 bg-light rounded'>
          <div className='d-flex justify-content-between align-items-center mb-2'>
            <span className='text-muted'>Current version:</span>
            <strong>{currentVersion}</strong>
          </div>
          <div className='d-flex justify-content-between align-items-center'>
            <span className='text-muted'>New version:</span>
            <strong className='text-success'>{newVersion}</strong>
          </div>
        </div>
        <p className='mb-0 text-muted small'>
          The application will reload to apply the update.
        </p>
      </Modal.Body>
      <Modal.Footer className='d-flex gap-2 justify-content-center'>
        <Button
          variant='secondary'
          onClick={onLater}
          style={{
            minWidth: '120px',
            width: '45%',
            whiteSpace: 'nowrap',
          }}
        >
          Later
        </Button>
        <Button
          variant='primary'
          onClick={onUpdate}
          style={{
            minWidth: '120px',
            width: '45%',
            whiteSpace: 'nowrap',
          }}
        >
          Update now!
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default UpdateModal
