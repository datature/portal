import React, { ReactElement } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

type AnalyticsBarProps = {
    analyticsResults: Array<Array<any>>
    confidence: number
}

export function AnalyticsBar(props: AnalyticsBarProps) {
    const [data, setData] = React.useState<any[]>([])
    const [lines, setLines] = React.useState<ReactElement[]>([])
    React.useEffect(()=>{
        const newData:any[] = []
        const newLines = new Set()
        for(var k in props.analyticsResults) {
            const dataPoint: any = { "frame": k }
            props.analyticsResults[k].forEach(v => {
                if(v.confidence < props.confidence) return
                dataPoint[v.tag.name] = (dataPoint[v.tag.name] || 0) + 1
                newLines.add(v.tag.name)
            })
            newData.push(dataPoint)
        }
        console.log(newData)
        console.log(newLines)
        setData(newData)
        setLines(Array.from(newLines).map(str => <Line key={str} type='monotone' dataKey={str} />))
    }, [props.analyticsResults, props.confidence])
    return (<LineChart width={1400} height={120} data={data}>
                <XAxis dataKey='frame' />
                <YAxis />
                {lines}
                <Tooltip />
            </LineChart>)
}