function Guide() {
  return (
    <main className="page-container guide-page">
      <section className="card wide-card">
        <header className="page-header">
          <div>
            <h1>Deployment & DDNS Integration Guide</h1>
            <p>Step-by-step instructions for hosting the Compliance Hub and connecting remote NGO camera streams.</p>
          </div>
        </header>

        <div className="guide-layout">
          {/* Navigation index */}
          <aside className="guide-toc">
            <h3>GUIDE SECTIONS</h3>
            <ul>
              <li><a href="#vps-setup">1. VPS Server Installation</a></li>
              <li><a href="#ddns-setup">2. Dynamic DNS (DDNS) setup</a></li>
              <li><a href="#port-forwarding">3. Router Port Forwarding</a></li>
              <li><a href="#hub-configuration">4. Camera Registry Configuration</a></li>
              <li><a href="#security-hardening">5. Security & IP Whitelisting</a></li>
            </ul>
          </aside>

          {/* Guide Content */}
          <article className="guide-content-body">
            <section id="vps-setup" className="guide-section">
              <h2>1. Hostinger VPS Server Setup (Ubuntu 22.04 LTS)</h2>
              <p>To deploy the CCTV Compliance Hub and stream remote cameras globally, configure a VPS with standard ports.</p>
              
              <div className="code-instruction-block">
                <h4>Step 1: Install Node.js & SQLite</h4>
                <pre><code>{`# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs sqlite3`}</code></pre>
              </div>

              <div className="code-instruction-block">
                <h4>Step 2: Set up MediaMTX (Surveillance Proxy Streamer)</h4>
                <p>MediaMTX acts as the server-side proxy bridging the RTSP feeds. Configure it to listen on all interfaces:</p>
                <pre><code>{`# Download MediaMTX release
wget https://github.com/bluenviron/mediamtx/releases/download/v1.6.0/mediamtx_v1.6.0_linux_amd64.tar.gz
tar -xvzf mediamtx_v1.6.0_linux_amd64.tar.gz

# Run MediaMTX in the background
./mediamtx`}</code></pre>
              </div>
            </section>

            <section id="ddns-setup" className="guide-section">
              <h2>2. Dynamic DNS (DDNS) Compatibility Setup</h2>
              <p>Since most NGOs use residential or dynamic business internet, their public IP changes frequently. Setting up DDNS ensures the cloud hub never loses connectivity.</p>
              
              <div className="steps-ordered-list">
                <div className="step-item-guide">
                  <span className="step-num-badge">1</span>
                  <div>
                    <strong>Create a Hostname:</strong> Register a free domain name via a DDNS provider such as <strong>No-IP</strong>, <strong>DynDNS</strong>, or <strong>DuckDNS</strong> (e.g., <code>hopefoundation.ddns.net</code>).
                  </div>
                </div>
                <div className="step-item-guide">
                  <span className="step-num-badge">2</span>
                  <div>
                    <strong>Configure DDNS Client:</strong> Log in to the NGO's local router (usually <code>192.168.1.1</code> or <code>192.168.31.1</code>), go to <strong>Dynamic DNS / DDNS Settings</strong>, and type your username, password, and registered hostname.
                  </div>
                </div>
                <div className="step-item-guide">
                  <span className="step-num-badge">3</span>
                  <div>
                    <strong>Alternative software clients:</strong> If the local router does not support DDNS directly, install the DDNS Update Client on any local computer or server running inside the NGO's office.
                  </div>
                </div>
              </div>
            </section>

            <section id="port-forwarding" className="guide-section">
              <h2>3. Port Forwarding Rules on NGO Router</h2>
              <p>For the central Cloud server to connect to a camera feed inside the local network, you must tell the router to forward incoming traffic to the camera's local IP address.</p>
              
              <table className="classic-table" style={{ margin: '16px 0' }}>
                <thead>
                  <tr>
                    <th>Service Port</th>
                    <th>Default Port</th>
                    <th>Forwarding Target (LAN)</th>
                    <th>Protocol</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>RTSP Port</td>
                    <td><code>554</code></td>
                    <td>Camera Local IP (e.g. <code>192.168.31.199:554</code>)</td>
                    <td>TCP</td>
                  </tr>
                  <tr>
                    <td>HTTP Port (Web admin)</td>
                    <td><code>80</code></td>
                    <td>Camera Local IP (e.g. <code>192.168.31.199:80</code>)</td>
                    <td>TCP</td>
                  </tr>
                  <tr>
                    <td>HTTPS Port</td>
                    <td><code>443</code></td>
                    <td>Camera Local IP (e.g. <code>192.168.31.199:443</code>)</td>
                    <td>TCP</td>
                  </tr>
                </tbody>
              </table>

              <div className="info-box-tip">
                <strong>💡 Tip:</strong> If registering multiple cameras on the same network, change the external port mapping on the router:
                <ul>
                  <li>Camera 1: Router external port <code>5501</code> → Local Camera 1 IP port <code>554</code></li>
                  <li>Camera 2: Router external port <code>5502</code> → Local Camera 2 IP port <code>554</code></li>
                </ul>
              </div>
            </section>

            <section id="hub-configuration" className="guide-section">
              <h2>4. Camera Configuration in the Portal</h2>
              <p>Once DDNS and port forwarding are active, log in to this console and register the camera:</p>
              
              <div className="steps-ordered-list">
                <div className="step-item-guide">
                  <span className="step-num-badge">A</span>
                  <div>
                    <strong>Select Vendor:</strong> Choose <code>CP Plus / Dahua</code> or <code>Hikvision</code> or <code>Generic IP Camera</code>.
                  </div>
                </div>
                <div className="step-item-guide">
                  <span className="step-num-badge">B</span>
                  <div>
                    <strong>Enter Host domain:</strong> Instead of a raw IP, enter your registered DDNS address (e.g. <code>hopefoundation.ddns.net</code>).
                  </div>
                </div>
                <div className="step-item-guide">
                  <span className="step-num-badge">C</span>
                  <div>
                    <strong>Provide Ports & Credentials:</strong> Type the external RTSP port forwarded (usually <code>554</code>) along with the camera's local username/password (e.g., <code>ary</code> / <code>ARY@123456</code>).
                  </div>
                </div>
              </div>
            </section>

            <section id="security-hardening" className="guide-section">
              <h2>5. Security & Whitelisting Best Practices</h2>
              <p>Opening ports to the public internet can be unsafe. Protect the NGO cameras using these steps:</p>
              <ul>
                <li><strong>IP Whitelisting:</strong> In the NGO router's firewall rules, restrict incoming port <code>554</code> traffic to allow connections *only* from the IP address of your central Cloud Hostinger VPS.</li>
                <li><strong>Complex Credentials:</strong> Never use default passwords (like admin/admin). Ensure the passwords are robust (e.g. <code>ARY@123456</code>).</li>
                <li><strong>Disable UPnP:</strong> Turn off Universal Plug and Play (UPnP) on the router to prevent cameras from auto-opening random public ports.</li>
              </ul>
            </section>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Guide;
