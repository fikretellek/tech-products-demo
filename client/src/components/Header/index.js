import { Link, NavLink } from "react-router-dom";

import "./Header.scss";
import logo from "./logo.png";

export default function Header() {
	return (
		<header>
			<h1>
				<Link to="/">
					<img alt="" src={logo} />
					&nbsp;Resources
				</Link>
			</h1>
			<nav>
				<ul>
					<li>
						<NavLink to="/suggest">Suggest</NavLink>
					</li>
				</ul>
				<ul>
					<li>
						<NavLink to="/about">About</NavLink>
					</li>
				</ul>
			</nav>
		</header>
	);
}