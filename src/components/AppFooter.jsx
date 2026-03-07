/**
 * @file AppFooter.jsx
 * @description Footer component with application information
 */

import React from 'react'
import { Card } from 'react-bootstrap'
import packageJson from '../../package.json'

/**
 * Footer component rendered as a Bootstrap Card.Footer
 *
 * @returns {JSX.Element} The rendered footer component
 */
const AppFooter = () => {
  const { version, releaseDate } = packageJson

  return (
    <Card.Footer className='text-center text-muted fs-9 py-2'>
      <div>&copy; {new Date().getFullYear()} DynDNS Updater &mdash; All rights reserved.</div>
      <div>
        Version {version} &middot; Released on {releaseDate}
      </div>
    </Card.Footer>
  )
}

export default AppFooter
