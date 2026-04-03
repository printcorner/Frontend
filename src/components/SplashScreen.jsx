import React from "react";
import styles from "./SplashScreen.module.css";
import logo from "../assets/xerox-logo.webp";

const SplashScreen = ({ progress }) => {
  return (
    <div className={styles.splash}>
      <img src={logo} alt="Logo" className={styles.logo} />

      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${progress}%` }} />
      </div>

      <span className={styles.hint}>Starting App...</span>
    </div>
  );
};

export default SplashScreen;
