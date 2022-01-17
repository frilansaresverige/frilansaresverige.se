import { ReactChild } from 'react'
import styles from './Title.module.css'

const Title = ({ children }: { children: ReactChild }) => {
  return <div className={styles.title}>{children}</div>
}

export default Title
