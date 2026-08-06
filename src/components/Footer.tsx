
import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Globe, Instagram, Heart } from 'lucide-react';
import AlphabeticalFilter from './AlphabeticalFilter';

const SocialIcon = ({ href, children, label }: { href: string; children: React.ReactNode; label: string }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-gray-400 hover:text-white transition-colors">
        {children}
    </a>
);

const apiCredits = [
    { name: 'Jikan (MyAnimeList)', url: 'https://jikan.moe' },
    { name: 'AnimeFLV API', url: 'https://animeflv.ahmedrangel.com' },
    { name: 'waifu.pics', url: 'https://waifu.pics' },
    { name: 'Danbooru', url: 'https://danbooru.donmai.us' },
    { name: 'nekos.best', url: 'https://nekos.best' },
    { name: 'OtakuGIFs', url: 'https://otakugifs.xyz' },
];

const Footer = () => {
    return (
        <footer className="w-full bg-[#181520] text-gray-300 py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <Link to="/" className="text-3xl font-extrabold tracking-tight" style={{ color: "#7D36FF" }}>
                        captureordie
                    </Link>
                    <div className="flex items-center space-x-5">
                        <SocialIcon href="https://www.instagram.com/captureordie/" label="Instagram">
                            <Instagram className="h-6 w-6" />
                        </SocialIcon>
                        <SocialIcon href="https://x.com/captureordie04" label="Twitter / X">
                            <Twitter className="h-6 w-6" />
                        </SocialIcon>
                        <SocialIcon href="https://www.reddit.com/user/GuiltyAppointment1/" label="Reddit">
                            <Globe className="h-6 w-6" />
                        </SocialIcon>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                    <div>
                        <h4 className="text-white font-semibold mb-3">About</h4>
                        <p className="text-gray-400 leading-relaxed">
                            CaptureOrDie is a fan-made anime discovery platform: browse the top
                            anime and manga, watch episodes via third-party streams, and explore
                            high-quality images and GIFs. Built with <span className="text-gray-300">React</span>,{' '}
                            <span className="text-gray-300">TypeScript</span>, and <span className="text-gray-300">Tailwind CSS</span>.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-3">API Credits</h4>
                        <ul className="space-y-1.5">
                            {apiCredits.map((credit) => (
                                <li key={credit.name}>
                                    <a
                                        href={credit.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        {credit.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-3">Legal</h4>
                        <ul className="space-y-1.5">
                            <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                            <li><Link to="/dmca" className="text-gray-400 hover:text-white transition-colors">DMCA</Link></li>
                            <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <AlphabeticalFilter />

                <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-400 space-y-4 sm:space-y-0">
                    <p>© {new Date().getFullYear()} captureordie. All rights reserved.</p>
                    <p className="flex items-center gap-1">
                        Made with <Heart className="w-4 h-4 text-pink-500 fill-current" /> for anime fans
                    </p>
                </div>
                <div className="text-center text-xs text-gray-500 pt-4">
                    <p>captureordie does not store any files on our server, we only link to media which is hosted on 3rd party services.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
