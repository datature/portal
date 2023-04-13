import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

type AnalyticsBarProps = {
    analyticsResults: Record<number, Array<any>>
    confidence: number
}

export function AnalyticsBar(props: AnalyticsBarProps) {
    const data = Object.entries(props.analyticsResults).map(e => {
        const [k, v] = e
        const dataPoint: any = { "frame": k }
        v.filter(e => e.confidence >= props.confidence).forEach(e => {
            dataPoint[e.tag.name] = (dataPoint[e.tag.name] || 0) + 1
        })
        return dataPoint
    })

    const lines : any[] = Array.from(new Set(Object.entries(props.analyticsResults)
            .flatMap(e => e[1].filter(e => e.confidence >= props.confidence).map(e => e.tag.name))))
            .map(str => <Line key={str} type='monotone' dataKey={str} />)

    // Width and height are temporary
    return (<LineChart width={1400} height={120} data={data}>
                <XAxis dataKey='frame' />
                <YAxis />
                {lines}
                <Tooltip />
            </LineChart>)
}