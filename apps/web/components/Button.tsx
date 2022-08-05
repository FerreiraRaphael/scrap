import clsx from "clsx";
import styles from "./Button.module.css";

export function Button({ className, ...props }: React.HtmlHTMLAttributes<HTMLButtonElement>) {
  return <button className={clsx(
    styles.Button, className)}
    {...props}
  />
}
