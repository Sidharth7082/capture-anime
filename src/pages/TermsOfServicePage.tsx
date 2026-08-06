
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

const TermsOfServicePage = () => {
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
                        <span className="text-gray-400"><Link to="/" className="hover:text-white">Home</Link> &gt; Terms and Conditions</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-8">captureordie Website Terms and Conditions of Use</h1>

                    <Section title="1. Terms">
                        <p>By accessing this Website, accessible from captureordie, you are agreeing to be bound by these Website Terms and Conditions of Use and agree that you are responsible for the agreement with any applicable local laws. If you disagree with any of these terms, you are prohibited from accessing this site. The materials contained in this Website are protected by copyright and trademark law.</p>
                    </Section>

                    <Section title="2. Use License">
                        <p>Permission is granted to temporarily download one copy of the materials on captureordie's Website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li>modify or copy the materials;</li>
                            <li>use the materials for any commercial purpose or for any public display;</li>
                            <li>attempt to reverse engineer any software contained on captureordie's Website;</li>
                            <li>remove any copyright or other proprietary notations from the materials; or</li>
                            <li>transferring the materials to another person or "mirror" the materials on any other server.</li>
                        </ul>
                        <p>This will let captureordie to terminate upon violations of any of these restrictions. Upon termination, your viewing right will also be terminated and you should destroy any downloaded materials in your possession whether it is printed or electronic format.</p>
                    </Section>

                    <Section title="3. Disclaimer">
                        <p>All the materials on captureordie's Website are provided "as is". captureordie makes no warranties, may it be expressed or implied, therefore negates all other warranties. Furthermore, captureordie does not make any representations concerning the accuracy or reliability of the use of the materials on its Website or otherwise relating to such materials or any sites linked to this Website.</p>
                    </Section>

                    <Section title="4. Limitations">
                        <p>captureordie or its suppliers will not be hold accountable for any damages that will arise with the use or inability to use the materials on captureordie's Website, even if captureordie or an authorize representative of this Website has been notified, orally or written, of the possibility of such damage. Some jurisdiction does not allow limitations on implied warranties or limitations of liability for incidental damages, these limitations may not apply to you.</p>
                    </Section>

                    <Section title="5. Revisions and Errata">
                        <p>The materials appearing on captureordie's Website may include technical, typographical, or photographic errors. captureordie will not promise that any of the materials in this Website are accurate, complete, or current. captureordie may change the materials contained on its Website at any time without notice. captureordie does not make any commitment to update the materials.</p>
                    </Section>

                    <Section title="6. Links">
                        <p>captureordie has not reviewed all of the sites linked to its Website and is not responsible for the contents of any such linked site. The presence of any link does not imply endorsement by captureordie of the site. The use of any linked website is at the user's own risk.</p>
                    </Section>

                    <Section title="7. Site Terms of Use Modifications">
                        <p>captureordie may revise these Terms of Use for its Website at any time without prior notice. By using this Website, you are agreeing to be bound by the current version of these Terms and Conditions of Use.</p>
                    </Section>

                    <Section title="8. Your Privacy">
                        <p>Please read our Privacy Policy.</p>
                    </Section>

                    <Section title="9. Governing Law">
                        <p>Any claim related to captureordie's Website shall be governed by the laws of our country of residence without regards to its conflict of law provisions.</p>
                    </Section>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default TermsOfServicePage;
