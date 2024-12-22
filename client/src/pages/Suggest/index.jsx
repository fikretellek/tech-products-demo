import clsx from "clsx";
import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";

import { usePrincipal } from "../../authContext";
import { Form, FormControls } from "../../components";
import { ResourceService, TopicService, useService } from "../../services";

import "./Suggest.scss";

export default function Suggest() {
	const [message, setMessage] = useState(undefined);
	const [topics, setTopics] = useState(undefined);
	const resourceService = useService(ResourceService);
	const topicService = useService(TopicService);

	const principal = usePrincipal();
	const isAdmin = principal?.is_admin;

	useEffect(() => {
		topicService.getTopics().then(setTopics);
	}, [topicService]);

	const submitForm = useCallback(
		async (formData) => {
			const suggestion = Object.fromEntries(
				Object.entries(formData).filter(([, value]) => value !== "")
			);
			try {
				await resourceService.suggest(suggestion);
				setMessage({
					success: true,
					text: "Thank you for suggesting a resource!",
				});
			} catch (err) {
				setMessage({
					success: false,
					text: `Resource suggestion failed: ${err.message}.`,
				});
				throw err;
			}
		},
		[resourceService]
	);

	const publicationText = isAdmin
		? "Note that it will appear on the home page immediately, as you are an administrator."
		: "Note that it will not appear on the home page immediately, as it needs to be reviewed by an administrator.";

	return (
		<>
			<h2>Suggest a resource</h2>
			<p>Please use the form below to submit a suggestion. </p>
			<p>{publicationText}</p>

			<section>
				{message && <Message {...message} />}
				<Form
					label="Suggest resource"
					onChange={() => setMessage(undefined)}
					onSubmit={submitForm}
					resetButton="Clear"
					submitButton="Suggest"
				>
					<FormControls.Input label="Title" name="title" required />
					<FormControls.Input label="URL" name="url" required type="url" />
					<FormControls.Textarea label="Description" name="description" />
					<FormControls.Select
						label="Topic"
						placeholder="Select a topic"
						name="topic"
						options={topics}
						title="topic"
					/>
				</Form>
			</section>
		</>
	);
}

function Message({ success, text }) {
	return (
		<p className={clsx("message", success ? "success" : "failure")}>{text}</p>
	);
}

Message.propTypes = {
	success: PropTypes.bool.isRequired,
	text: PropTypes.string.isRequired,
};
