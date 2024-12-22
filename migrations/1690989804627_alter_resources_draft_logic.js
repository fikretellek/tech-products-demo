exports.up = (pgm) => {
	pgm.createFunction(
		"set_resource_values_before_insert",
		[],
		{
			returns: "trigger",
			language: "plpgsql",
			replace: true,
		},
		`
    BEGIN
      IF EXISTS (
        SELECT 1 FROM users
        WHERE users.id = NEW.source
        AND users.is_admin = TRUE
      ) THEN
        NEW.publisher = NEW.source;
        NEW.publication = now();
        NEW.draft = FALSE;
      END IF;
      RETURN NEW;
    END;
    `
	);

	pgm.sql(`
    CREATE TRIGGER set_resource_values_before_insert
    BEFORE INSERT ON resources
    FOR EACH ROW
    EXECUTE FUNCTION set_resource_values_before_insert();
  `);
};

exports.down = (pgm) => {
	pgm.sql(
		"DROP TRIGGER IF EXISTS set_resource_values_before_insert ON resources;"
	);
	pgm.dropFunction("set_resource_values_before_insert", [], {
		ifExists: true,
	});
};
