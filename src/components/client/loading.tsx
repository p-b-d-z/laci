import React from 'react';
import styles from '@/styles/loading.module.css';

const LoadingSpinner: React.FC = () => {
	return (
		<div className={styles.loadingSpinner}>
			<div className={styles.spinner}></div>
		</div>
	);
};

export default LoadingSpinner;
