"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/app/lib/utils";
import { buttonVariants } from "@/app/components/ui/button";

function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-fit",
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex w-full flex-col gap-4",
        nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
        button_previous: cn(buttonVariants({ variant: "outline" }), "size-7 bg-transparent p-0 opacity-70 hover:opacity-100"),
        button_next: cn(buttonVariants({ variant: "outline" }), "size-7 bg-transparent p-0 opacity-70 hover:opacity-100"),
        month_caption: "flex h-7 w-full items-center justify-center px-8",
        dropdowns: "flex h-7 w-full items-center justify-center gap-1.5 text-sm font-medium",
        caption_label: "text-sm font-medium select-none",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none",
        week: "mt-2 flex w-full",
        day: "group/day relative aspect-square h-9 w-9 flex-1 p-0 text-center text-sm select-none",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal group-data-[selected=true]/day:bg-primary group-data-[selected=true]/day:text-primary-foreground group-data-[selected=true]/day:hover:bg-primary",
        ),
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        range_start: "rounded-l-md bg-accent",
        range_middle: "rounded-none",
        range_end: "rounded-r-md bg-accent",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className: cls, orientation, ...rest }) => {
          if (orientation === "left") return <ChevronLeftIcon className={cn("size-4", cls)} {...rest} />;
          if (orientation === "right") return <ChevronRightIcon className={cn("size-4", cls)} {...rest} />;
          return <ChevronDownIcon className={cn("size-4", cls)} {...rest} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
