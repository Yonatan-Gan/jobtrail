import type { ButtonHTMLAttributes } from "react";
import { buttonClasses, type ButtonVariant } from "./buttonStyles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// type="button" by default: a plain <button> inside a <form> would submit it.
export function Button({
  variant = "secondary",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonClasses(variant)} ${className}`}
      {...props}
    />
  );
}
