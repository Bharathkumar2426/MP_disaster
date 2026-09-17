import { useEffect, useState } from "react";

function Counter({ end }) {

    const [count, setCount] = useState(0);

    useEffect(() => {

        let start = 0;

        const duration = 1200;

        const increment = end / (duration / 20);

        const timer = setInterval(() => {

            start += increment;

            if (start >= end) {

                setCount(end);

                clearInterval(timer);

            } else {

                setCount(Math.floor(start));

            }

        }, 20);

        return () => clearInterval(timer);

    }, [end]);

    return count;

}

export default Counter;