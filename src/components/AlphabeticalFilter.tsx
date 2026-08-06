
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AlphabeticalFilter = () => {
    const { letter: activeLetter } = useParams<{ letter?: string }>();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const special = ['All', '#', '0-9'];

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">A-Z List</h3>
                <span className="text-sm text-gray-400">Search anime by alphabet</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                {special.map(char => (
                     <Button
                        key={char}
                        asChild
                        variant="secondary"
                        className={cn("bg-gray-700/50 hover:bg-gray-600/70 text-white font-bold", {
                            'cursor-not-allowed opacity-50': char !== 'All',
                            'bg-purple-600': activeLetter?.toLowerCase() === char.toLowerCase() || (!activeLetter && char === 'All')
                        })}
                        disabled={char !== 'All'}
                    >
                        <Link to={char === 'All' ? '/' : '#'}>{char}</Link>
                    </Button>
                ))}
                {alphabet.map(letter => (
                     <Button key={letter} asChild variant="secondary" className={cn("bg-gray-700/50 hover:bg-gray-600/70 text-white font-bold", {
                         'bg-purple-600': activeLetter?.toLowerCase() === letter.toLowerCase()
                     })}>
                        <Link to={`/browse/${letter.toLowerCase()}`}>{letter}</Link>
                    </Button>
                ))}
            </div>
        </div>
    );
};

export default AlphabeticalFilter;

