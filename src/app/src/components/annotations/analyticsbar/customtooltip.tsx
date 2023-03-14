import React from "react";

import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { Card } from "@blueprintjs/core";
import { TooltipProps } from "recharts";

const CustomTooltip = ({
  active,
  payload,
}: TooltipProps<ValueType, NameType>): JSX.Element => {
  if (active && payload && payload.length >= 1) {
    return (
      <Card style={{ padding: 0, margin: 0 }}>
        <ul style={{ padding: "10px 20px" }}>
          {payload?.map(item => (
            <li key={item.dataKey} style={{ color: item.color }}>
              {item.name} : {item.value}
            </li>
          ))}
        </ul>
      </Card>
    );
  }
  return <></>;
};
export default CustomTooltip;
