import type { ComponentProps } from "react";
import { buttonClasses, type ButtonVariant } from "./buttonStyles";

// ComponentProps<"button"> is every prop a <button> takes, including `ref`
// (in React 19 a ref is an ordinary prop, so no forwardRef is needed).
interface ButtonProps extends ComponentProps<"button"> {
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
