const Field = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  name,
  autoComplete,
  options,
  required = false,
}) => {
  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label}
        {required && <span className="field__req">*</span>}
      </label>
      {options ? (
        <select
          id={name}
          name={name}
          className="input-field"
          value={value}
          onChange={onChange}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          className="input-field"
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
      )}
    </div>
  );
};

export default Field;