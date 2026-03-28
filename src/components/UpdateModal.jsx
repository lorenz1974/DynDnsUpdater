/**
 * @file UpdateModal.jsx
 * @author Lorenzo Lione <https://github.com/lorenz1974>
 * @description Modale per notificare aggiornamenti disponibili della PWA
 * @created March 2026
 * @license MIT
 */

import React from 'react'
import { Modal, Button } from 'react-bootstrap'

/**
 * UpdateModal - Modale che mostra la disponibilità di un aggiornamento
 *
 * @param {Object} props
 * @param {boolean} props.show - Se il modale è visibile
 * @param {string} props.currentVersion - Versione attuale installata
 * @param {string} props.newVersion - Nuova versione disponibile
 * @param {Function} props.onUpdate - Callback per confermare l'aggiornamento
 * @param {Function} props.onLater - Callback per rimandare l'aggiornamento
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
        <Modal.Title>🎉 Aggiornamento Disponibile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>È disponibile una nuova versione dell'applicazione!</p>
        <div className='my-3 p-3 bg-light rounded'>
          <div className='d-flex justify-content-between align-items-center mb-2'>
            <span className='text-muted'>Versione attuale:</span>
            <strong>{currentVersion}</strong>
          </div>
          <div className='d-flex justify-content-between align-items-center'>
            <span className='text-muted'>Nuova versione:</span>
            <strong className='text-success'>{newVersion}</strong>
          </div>
        </div>
        <p className='mb-0 text-muted small'>
          L'applicazione verrà ricaricata per applicare l'aggiornamento.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onLater}>
          Più tardi
        </Button>
        <Button variant='primary' onClick={onUpdate}>
          Aggiorna ora
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default UpdateModal
