
import React from 'react';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Link, useNavigate } from 'react-router-dom';
import type { JikanAnime } from "@/types/jikan";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">{title}</h2>
        <div className="space-y-4 text-gray-400">
            {children}
        </div>
    </section>
);

const DMCAPage = () => {
    const navigate = useNavigate();
    const handleSearch = (anime: JikanAnime | null) => {
        if (anime) {
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#181520] text-gray-300">
            <NavBar onSearch={handleSearch} />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <span className="text-gray-400"><Link to="/" className="hover:text-white">Home</Link> &gt; DMCA</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-8">DMCA takedown request requirements</h1>

                    <p className="mb-8 text-gray-400">We take the intellectual property rights of others seriously and require that our Users do the same. The Digital Millennium Copyright Act (DMCA) established a process for addressing claims of copyright infringement. If you own a copyright or have authority to act on behalf of a copyright owner and want to report a claim that a third party is infringing that material on or through captureordie services, please submit a DMCA report on our <Link to="/contact" className="text-purple-400 hover:underline">Contact page</Link>, and we will take appropriate action.</p>

                    <Section title="DMCA Report requirements">
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li>A description of the copyrighted work that you claim is being infringed;</li>
                            <li>A description of the material you claim is infringing and that you want removed or access to which you want disabled and the URL or other location of that material;</li>
                            <li>Your name, title (if acting as an agent), address, telephone number, and email address;</li>
                            <li>The following statement: "I have a good faith belief that the use of the copyrighted material I am complaining of is not authorized by the copyright owner, its agent, or the law (e.g. as a fair use)";</li>
                            <li>The following statement: "The information in this notice is accurate and, under penalty of perjury, I am the owner, or authorized to act on behalf of the owner, of the copyright or of an exclusive right that is allegedly infringed";</li>
                            <li>An electronic or physical signature of the owner of the copyright or a person authorized to act on the owner's behalf.</li>
                        </ul>
                    </Section>

                    <p className="mb-8 text-gray-400">
                        Your DMCA take down request should be submitted via our <Link to="/contact" className="text-purple-400 hover:underline">contact page</Link>.
                    </p>
                    <p className="mb-8 text-gray-400">
                        We will then review your DMCA request and take proper actions, including removal of the content from the website.
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default DMCAPage;
