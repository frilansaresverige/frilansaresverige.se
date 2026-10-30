import styles from '../uppdrag.module.css'

export default function AssignmentNotFound() {
  return (
    <div className={styles.wrapper}>
      <h1>Hantera publikation</h1>
      <p>Den publikation du söker kunde inte hittas.</p>
    </div>
  )
}
