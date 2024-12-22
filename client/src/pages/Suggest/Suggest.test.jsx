import { randomUUID } from "node:crypto";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "../../../setupTests";
import { usePrincipal } from "../../authContext";

import Suggest from "./index";

vi.mock("../../authContext");

describe("Suggest", () => {
	it("allows the user to submit a resource", async () => {
		let requestBody;
		const title = "hello";
		const url = "https://example.com";
		const user = userEvent.setup();
		server.use(
			http.get("/api/topics", () => HttpResponse.json([])),
			http.post("/api/resources", async ({ request: req }) => {
				requestBody = await req.json();
				return HttpResponse.json({}, { status: 201 });
			})
		);
		render(<Suggest />);

		await user.type(screen.getByRole("textbox", { name: /title/i }), title);
		await user.type(screen.getByRole("textbox", { name: /url/i }), url);
		await user.click(screen.getByRole("button", { name: /suggest/i }));

		await expect(
			screen.findByText(/thank you for suggesting a resource/i)
		).resolves.toHaveClass("message", "success");
		expect(requestBody).toEqual({ title, url });
		expect(screen.getByRole("form")).toHaveFormValues({
			description: "",
			title: "",
			url: "",
		});
	});

	it("allows the user to include a description", async () => {
		const description = "Check colour contrast for accessibility.";
		let requestBody;
		const user = userEvent.setup();
		server.use(
			http.get("/api/topics", () => HttpResponse.json([])),
			http.post("/api/resources", async ({ request: req }) => {
				requestBody = await req.json();
				return HttpResponse.json({}, { status: 201 });
			})
		);
		render(<Suggest />);

		await user.type(
			screen.getByRole("textbox", { name: /description/i }),
			description
		);
		await user.type(
			screen.getByRole("textbox", { name: /title/i }),
			"WebAIM Contrast Checker"
		);
		await user.type(
			screen.getByRole("textbox", { name: /url/i }),
			"https://webaim.org/resources/contrastchecker/"
		);
		await user.click(screen.getByRole("button", { name: /suggest/i }));

		await screen.findByText(/thank you for suggesting a resource/i);
		expect(requestBody).toHaveProperty("description", description);
	});

	it("gives useful feedback on failure", async () => {
		const title = "Official React documentation";
		const url = "https://react.dev/";
		const user = userEvent.setup();
		server.use(
			http.get("/api/topics", () => HttpResponse.json([])),
			http.post("/api/resources", () => {
				return new HttpResponse(null, { status: 409 });
			})
		);
		render(<Suggest />);
		await user.type(screen.getByRole("textbox", { name: /title/i }), title);
		await user.type(screen.getByRole("textbox", { name: /url/i }), url);
		await user.click(screen.getByRole("button", { name: /suggest/i }));
		await expect(
			screen.findByText(
				"Resource suggestion failed: a very similar resource already exists."
			)
		).resolves.toHaveClass("message", "failure");
		expect(screen.getByRole("textbox", { name: /title/i })).toHaveValue(title);
		expect(screen.getByRole("textbox", { name: /url/i })).toHaveValue(url);
	});

	it("shows the list of topics", async () => {
		const topics = {
			"HTML/CSS": randomUUID(),
			JavaScript: randomUUID(),
			"Professional Development": randomUUID(),
		};
		server.use(
			http.get("/api/topics", () => {
				return HttpResponse.json(
					Object.entries(topics).map(([topic, id]) => ({ id, name: topic }))
				);
			})
		);

		render(<Suggest />);

		expect(
			within(screen.getByRole("combobox", { name: /topic/i })).getByRole(
				"option",
				{ name: /select a topic/i }
			)
		).toBeDisabled();
		await waitFor(() =>
			expect(
				within(screen.getByRole("combobox", { name: /topic/i }))
					.getAllByRole("option")
					.map((el) => el.textContent)
			).toEqual(expect.arrayContaining(Object.keys(topics)))
		);
	});

	it("allows the user to include a topic", async () => {
		let requestBody;
		const topic = "Professional Development";
		const topicId = randomUUID();
		const user = userEvent.setup();
		server.use(
			http.get("/api/topics", () => {
				return HttpResponse.json([{ id: topicId, name: topic }]);
			}),
			http.post("/api/resources", async ({ request: req }) => {
				requestBody = await req.json();
				return HttpResponse.json({}, { status: 201 });
			})
		);

		render(<Suggest />);
		await user.type(screen.getByRole("textbox", { name: /title/i }), "Title");
		await user.type(
			screen.getByRole("textbox", { name: /url/i }),
			"https://example.com"
		);
		await user.selectOptions(
			screen.getByRole("combobox", { name: /topic/i }),
			topic
		);
		await user.click(screen.getByRole("button", { name: /suggest/i }));

		await screen.findByText(/thank you for suggesting a resource/i);
		expect(requestBody).toHaveProperty("topic", topicId);
	});

	it("allows the user to reset the form", async () => {
		const title = "Title";
		const topic = "Some Topic";
		const user = userEvent.setup();
		server.use(
			http.get("/api/topics", () => {
				return HttpResponse.json([{ id: randomUUID(), name: topic }]);
			})
		);
		render(<Suggest />);
		await user.type(screen.getByRole("textbox", { name: /title/i }), title);
		await user.selectOptions(
			screen.getByRole("combobox", { name: /topic/i }),
			topic
		);

		await user.click(screen.getByRole("button", { name: /clear/i }));

		expect(screen.getByRole("textbox", { name: /title/i })).toHaveValue("");
		expect(screen.getByRole("combobox", { name: /topic/i })).toHaveValue("");
	});

	it("renders info content specific to admin users", async () => {
		usePrincipal.mockReturnValue({ is_admin: true });
		render(<Suggest />);
		const adminMessage = await screen.findByText(
			/Note that it will appear on the home page immediately, as you are an administrator./i
		);
		expect(adminMessage).toBeInTheDocument();
	});

	it("renders info content specific to non-admin users", async () => {
		usePrincipal.mockReturnValue({});
		render(<Suggest />);
		const nonAdminMessage = await screen.findByText(
			/Note that it will not appear on the home page immediately, as it needs to be reviewed by an administrator./i
		);
		expect(nonAdminMessage).toBeInTheDocument();
	});
});
