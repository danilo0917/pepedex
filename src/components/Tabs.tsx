import toPercentString from "@/functions/format/toPercentString";
import { shrinkToValue } from "@/functions/shrinkToValue";
import { twMerge } from "tailwind-merge";
import { useUrlQuery } from "../hooks/useUrlQuery";
import RadioGroup, { RadioGroupProps } from "./RadioGroup";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RowTabProps<T extends string = string>
  extends RadioGroupProps<T> {
  /** when set, means open affect url query search  */
  urlSearchQueryKey?: string;
  /** only for <Tabs>  */
  $valuesLength?: number;
  /** only for <Tabs>  */
  $transparentBg?: boolean;
  size?: "md" | "sm";
}

/**
 * controlled component
 * Just inherit from `<StyledRadioGroup>` with ability to affect UrlHash
 * @returns
 */
export default function Tabs<T extends string = string>({
  size,
  $valuesLength,
  $transparentBg,
  urlSearchQueryKey,
  className,
  ...restProps
}: RowTabProps<T>) {
  useUrlQuery<T>({
    currentValue: restProps.currentValue,
    values: restProps.values,
    onChange: restProps.onChange,
    queryKey: urlSearchQueryKey,
  });

  //#region ------------------- base on total value -------------------
  const isValueSelected =
    restProps.currentValue && restProps.values.includes(restProps.currentValue);
  const totalLength = $valuesLength ?? restProps.values.length;
  const offsetStartIndex = 0;
  const currentValueIndex =
    (isValueSelected
      ? restProps.values.findIndex((v) => v === restProps.currentValue)
      : 0) + offsetStartIndex;
  //#endregion

  return (
    <RadioGroup
      {...restProps}
      currentValue={restProps.currentValue}
      className={twMerge(
        "rounded-full p-1",
        $transparentBg ? "bg-transparent" : "btn-small",
        className
      )}
      itemClassName={(checked) =>
        twMerge(
          size === "sm"
            ? "min-w-[82px] mobile:min-w-[64px] px-2 mobile:px-1.5 h-7 mobile:h-5 text-sm mobile:text-xs"
            : "min-w-[96px] mobile:min-w-[76px] px-3 mobile:px-2 h-9 mobile:h-7 text-sm mobile:text-xs ",
          `grid rounded-full place-items-center font-bold whitespace-nowrap ${
            checked ? "text-color" : "text-color"
          }`,
          shrinkToValue(restProps.itemClassName, [checked])
        )
      }
      itemStyle={(checked) =>
        checked
          ? {
              display: "inline-block",
              lineHeight: "1",
              fontSize: "15px",
              padding: "12px 24px",
              borderRadius: "3px",
              color: "#fff",
              fill: "#fff",
              textTransform: "uppercase",
              textAlign: "center",
              transition: "all .3s",
              backgroundColor: "#61CE70",
              fontFamily: "Roboto, Sans-serif",
              fontWeight: "500",
              borderStyle: "double",
              boxSizing: "border-box",
              cursor: "pointer",
            }
          : {}
      }
    />
  );
}
